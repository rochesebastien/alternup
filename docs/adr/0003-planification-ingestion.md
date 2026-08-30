# ADR-0003 — Planification de l'ingestion : script isolé + Dokploy Schedule Job

Statut : proposé (2026-08-29)

## Contexte

L'ingestion v1 (dump quotidien LBA `GET /job/v1/export`, régénéré à 3h00 heure de Paris —
rapport `docs/plans/discovery/d-la-bonne-alternance.md`) doit tourner une fois par jour,
hors requête HTTP, avec log par exécution et relance manuelle. Le rapport
`docs/plans/discovery/e-firecrawl-scheduling.md` a comparé trois mécanismes : Nitro
`scheduledTasks`, script isolé + Schedule Job Dokploy, endpoint HTTP protégé + cron
externe. Le déploiement est un conteneur Docker long-running géré par Dokploy
(`docs/deploy-dokploy.md`), dont l'image runtime contient les deps de production et le
client Prisma généré, mais ni devDeps ni alias Nuxt. Décision de gate déjà actée : **pas
de Nitro tasks** (expérimentales).

## Décision

### Mécanisme

Un **script d'ingestion isolé** `scripts/ingest-offres.ts`, exécuté par
`node scripts/ingest-offres.ts` (type stripping natif de Node ≥ 22.18, sans flag ni tsx),
déclenché par un **Schedule Job Dokploy de type Application** (Dokploy fait
`docker exec <conteneur> node scripts/ingest-offres.ts`, cron 5 champs, une entrée de log
par exécution dans l'UI Dokploy).

- **Cron** : `30 3 * * *` (UTC serveur) — soit 4h30/5h30 Paris, confortablement après la
  régénération du dump à 3h00 Paris, y compris en cas de retard côté LBA.
- **Justification vs Nitro tasks** (option A du rapport E) : feature marquée
  expérimentale (API mouvante au gré des bumps Nitro poussés par Nuxt), cron couplé au
  cycle de vie du serveur web (tué par un redéploiement, dupliqué en multi-instances),
  logs mêlés à ceux du serveur, pas de relance manuelle en prod sans construire un
  endpoint `runTask` maison.
- **Justification vs endpoint HTTP protégé** (option C) : une ingestion de plusieurs
  centaines de milliers de lignes ne tient pas dans un timeout HTTP/proxy ; le
  contournement 202 + async ferait perdre le statut d'échec au job appelant. L'option C
  reste la **roue de secours documentée** si les Schedule Jobs posaient problème sur
  l'instance.
- Le script est le même quel que soit le déclencheur : cron, relance manuelle, dev local.

### Accès à Prisma et au code partagé hors contexte Nuxt

Le conteneur runtime n'a ni alias `~`/`#imports` ni auto-imports Nitro. Le script est
donc autonome :

- **Prisma** : `import { PrismaClient } from '@prisma/client'` + `@prisma/adapter-pg`
  directement dans le script (mêmes options que `server/utils/prisma.ts`, mais instance
  propre — le singleton Nitro utilise `globalThis` et n'est pas réutilisable tel quel).
  Connexion via `process.env.DATABASE_URL`, déjà présent dans l'environnement du
  conteneur.
- **Code partagé** : imports **relatifs** vers `shared/utils/` (ex.
  `import { dedupHashOf } from '../shared/utils/offres.ts'`). Contrainte respectée par
  construction : `shared/utils/` est pur (zéro import Prisma/Nuxt) et n'utilise que des
  objets `const` (pas d'`enum` TS runtime), compatibles avec le type stripping.
- **Dockerfile** : ajouter `COPY scripts ./scripts` (et `COPY shared ./shared`) au stage
  runner ; la clé API LBA arrive par une nouvelle variable d'env `LBA_API_KEY` (déclarée
  dans `docs/deploy-dokploy.md`, lue par le script via `process.env` — pas besoin de
  passer par `runtimeConfig`, le script ne vit pas dans Nitro).

### Interface `Source` générique

```
scripts/
├── ingest-offres.ts          # orchestrateur : lock, boucle sources, ScrapeRun, exit code
└── ingest/
    ├── types.ts              # interface SourceIngestion + type OffreNormalisee
    ├── upsert.ts             # dédup url / dedup_hash, expiration (règles ADR-0002)
    └── sources/
        └── la-bonne-alternance.ts
```

```ts
export interface SourceIngestion {
  source: OffreSourceType
  /** Télécharge et normalise les offres ; itérable pour parser le dump en streaming. */
  collect(ctx: { log: (msg: string) => void }): AsyncIterable<OffreNormalisee>
}
```

Ajouter FT direct ou Firecrawl plus tard = un fichier dans `scripts/ingest/sources/` +
une valeur d'enum (ADR-0002), sans toucher l'orchestrateur. Le module LBA v1 : appel de
`/job/v1/export` (Bearer `LBA_API_KEY`), téléchargement immédiat de l'URL S3 présignée
(validité 2 min), parsing JSON en streaming (le dump couvre toute la France), filtrage
`contract.type ∈ { Apprentissage, Professionnalisation }` (toujours vrai côté LBA, mais
garde-fou) et mapping vers `OffreNormalisee`.

### Journal, idempotence, échecs

- **Un `ScrapeRun` par source et par exécution** : créé `en_cours` au début, complété
  (`statut`, compteurs, `erreurs`, `finishedAt`) à la fin — c'est le journal requêtable
  en base ; le log texte du script (stdout) est capturé par l'entrée de log Dokploy.
- **Idempotence** : toute écriture est un upsert par `url` / `dedupHash` (ADR-0002) ;
  relancer le script deux fois de suite ne crée aucun doublon et ne fait que rafraîchir
  `lastSeen`.
- **Verrou anti-concurrence** : au démarrage, le script refuse de tourner s'il existe un
  `ScrapeRun` `en_cours` de moins de 2 h pour la même source (relance manuelle pendant le
  cron) ; un run `en_cours` plus vieux est marqué `erreur` (crash antérieur) et le
  nouveau run démarre. Simple, sans advisory lock Postgres.
- **Échec par source, pas de crash global** : chaque source est enveloppée dans un
  `try/catch` ; une source en échec marque son `ScrapeRun` en `erreur` (message dans
  `erreurs`) et la boucle continue avec les suivantes. **L'expiration des offres d'une
  source n'est appliquée que si son run a réussi** (un dump illisible ne doit pas faire
  expirer tout le stock). Code de sortie : `1` si au moins une source a échoué (le job
  Dokploy apparaît en échec), `0` sinon.
- **Relance manuelle** : la même commande, depuis le terminal conteneur de l'UI Dokploy
  ou `docker exec` sur l'hôte ; en local, `node scripts/ingest-offres.ts` avec un
  `DATABASE_URL` et une clé sandbox LBA.

## Conséquences

- Nouveaux fichiers sous `scripts/` uniquement + 2 lignes au `Dockerfile` + 1 variable
  d'env (`LBA_API_KEY`) + 1 Schedule Job à créer dans l'UI Dokploy (à documenter dans
  `docs/deploy-dokploy.md`).
- Aucune dépendance nouvelle en v1 (fetch natif Node) ; `firecrawl` ne sera ajouté aux
  dependencies de production que le jour où une source Firecrawl existera.
- Les règles de dédup/normalisation sont partagées avec l'app (imports relatifs de
  `shared/utils/offres.ts`) et testées par Vitest ; le script lui-même se vérifie par
  exécution réelle (conforme à la politique de test du dépôt).
- Limite assumée : un redéploiement Dokploy pendant l'ingestion tue le run (visible en
  échec/`en_cours` périmé) ; le run suivant rattrape tout grâce à l'idempotence.

## Alternatives écartées

- **Nitro `scheduledTasks`** : expérimental, couplé au process web, pas de logs dédiés ni
  de relance prod — écarté à la gate, arguments détaillés au rapport E (§ Option A).
- **Endpoint `/api/internal/ingest` + cron** : timeout HTTP sur un traitement long ;
  conservé comme plan B documenté (rapport E, § Option C).
- **Service/worker séparé (image dédiée, queue)** : sur-ingénierie pour un batch
  quotidien mono-source ; la même image + `docker exec` suffit.
- **pg_cron / cron système dans le conteneur** : ajouterait un démon dans l'image et
  contournerait la visibilité (logs, statut) offerte nativement par Dokploy.
