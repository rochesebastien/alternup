# Veille d'offres — doc d'exploitation

Module de veille d'offres d'alternance pour les apprenants (v1 : alternance seule, pas
de stages). Décisions d'architecture : ADR-0002 (modèle de données), ADR-0003
(planification de l'ingestion), ADR-0004 (page Offres).

## Architecture

1. **Source** : La Bonne Alternance — dump JSON national quotidien `GET /job/v1/export`
   (API Apprentissage, Bearer `LBA_API_KEY`), régénéré à 3h00 Paris.
2. **Script** : `scripts/ingest-offres.ts` (Node ≥ 22.18, type stripping natif), lancé
   chaque nuit par un Schedule Job Dokploy (`docker exec`, cron `30 3 * * *` UTC).
3. **Base** : upsert idempotent dans PostgreSQL — tables `offres`, `offre_sources`,
   `offre_user_statuts`, journal `scrape_runs`.
4. **API** : `GET /api/offres` (liste filtrée/paginée server-side), `GET /api/offres/[id]`,
   `POST /api/offres/[id]/statut`, `GET /api/offres/stats`.
5. **Page** : `/alternant/offres` (rôles Alternant + Stagiaire), tableau + filtres +
   statut de candidature par offre.

## Relancer une ingestion à la main

La commande est la même partout : `node scripts/ingest-offres.ts`.

- **UI Dokploy** : bouton *Run* du Schedule `ingest-offres`, ou le terminal du conteneur
  de l'app (page du service Application → *Terminal*), puis la commande ci-dessus.
- **Hôte Dokploy** : `docker exec <conteneur-app> node scripts/ingest-offres.ts`.
- **Local** : `node scripts/ingest-offres.ts` à la racine du dépôt — le `.env` est chargé
  automatiquement si `DATABASE_URL` est absent de l'environnement. Sans clé LBA, utiliser
  la fixture : `LBA_EXPORT_URL_OVERRIDE=tests/fixtures/lba-export-sample.json`.

Relancer deux fois de suite est sans danger : toute écriture est un upsert
(`url` / `dedup_hash`), un re-run ne crée aucun doublon et ne fait que rafraîchir
`last_seen`. Code de sortie : `1` si au moins une source a échoué, `0` sinon.

## Lire les ScrapeRuns

Chaque exécution laisse une ligne par source dans `scrape_runs` (statut, compteurs,
erreurs). Depuis la console psql Dokploy (page du service Database) ou `npx prisma studio`
en local :

```sql
-- Les 10 derniers runs
SELECT source, statut, started_at, finished_at,
       offres_vues, offres_creees, offres_maj, offres_expirees, erreurs
FROM scrape_runs
ORDER BY started_at DESC
LIMIT 10;

-- Runs en échec des 7 derniers jours
SELECT source, started_at, erreurs
FROM scrape_runs
WHERE statut = 'erreur' AND started_at > now() - interval '7 days'
ORDER BY started_at DESC;

-- État du stock par source
SELECT os.source, o.statut, count(*)
FROM offres o JOIN offre_sources os ON os.offre_id = o.id
GROUP BY os.source, o.statut;
```

`erreurs` est un JSON `[{ message, contexte? }]` ; un run `succes` peut en porter un
**avertissement** (expiration sautée, voir ci-dessous). La durée d'un run se lit dans
`finished_at - started_at`.

## Comportement du script

- **Dédup** (ADR-0002) : clé primaire `url` (lien de candidature) ; à défaut de conflit
  d'URL, `dedup_hash` (sha256 de titre + entreprise + lieu normalisés) rattache une
  source supplémentaire à l'offre existante au lieu de créer un doublon.
- **Expiration douce** : jamais de suppression physique. Après un run **réussi**, passent
  `expiree` les offres non revues depuis 3 jours (`OFFRE_EXPIRATION_JOURS`), déclarées
  mortes par le payload (Filled/Cancelled) ou dont `date_expiration` est dépassée. Une
  offre revue active repasse `active`.
- **Garde anti-expiration massive** : si le run a vu moins de 50 % du stock actif de la
  source (dump vide ou amputé), l'expiration est sautée et un avertissement est consigné
  dans `ScrapeRun.erreurs` — plutôt que d'expirer tout le stock sur un dump anormal.
- **Verrou anti-concurrence** : un `ScrapeRun` `en_cours` de moins de 2 h bloque un
  nouveau run de la même source (relance pendant le cron) ; plus vieux, il est considéré
  comme un crash antérieur, marqué `erreur`, et le nouveau run démarre.
- **Échec par source** : chaque source est isolée ; un échec marque son `ScrapeRun` en
  `erreur` et n'empêche ni les sources suivantes ni les upserts déjà réalisés.
- **Alerte webhook** : si `ALERTE_WEBHOOK_URL` est définie et qu'au moins une source a
  échoué, le script POSTe un JSON minimal (sujet, sources en échec, messages tronqués,
  date), timeout 10 s, best-effort — un webhook injoignable est loggé et n'affecte pas
  le run.

## Variables d'environnement

| Variable | Requis | Rôle |
|---|---|---|
| `DATABASE_URL` | ✅ | Connexion PostgreSQL (déjà présente pour l'app) |
| `LBA_API_KEY` | ✅ (prod) | Jeton Bearer de l'API Apprentissage — créer la clé sur [api.apprentissage.beta.gouv.fr](https://api.apprentissage.beta.gouv.fr) |
| `ALERTE_WEBHOOK_URL` | — | Webhook d'alerte d'échec de run (rien si absente) |
| `LBA_EXPORT_URL_OVERRIDE` | — | Secours/tests : URL http(s) ou fichier local remplaçant l'appel `/job/v1/export` |

### Secours `LBA_EXPORT_URL_OVERRIDE`

Si l'endpoint `/job/v1/export` est indisponible alors qu'un miroir du dump existe (ou
pour rejouer un dump précis), poser `LBA_EXPORT_URL_OVERRIDE` sur l'URL ou le chemin du
fichier : le script saute l'appel API (et donc `LBA_API_KEY`) et ingère directement ce
contenu. C'est aussi le mécanisme des tests locaux avec
`tests/fixtures/lba-export-sample.json`.

## Ajouter une source future (FT direct, autre agrégateur…)

Le périmètre reste des **offres publiées** — jamais de scraping de profils ni de données
personnelles. Trois gestes, sans toucher l'orchestrateur (ADR-0002 / ADR-0003) :

1. Une valeur dans l'enum `OffreSourceType` (`prisma/schema.prisma` **et** son miroir
   `shared/utils/enums.ts`) + `npx prisma migrate dev --name <slug>`.
2. Un module `scripts/ingest/sources/<source>.ts` implémentant l'interface
   `SourceIngestion` (`scripts/ingest/types.ts`) : `collect()` télécharge, normalise en
   `OffreNormalisee` et streame — la dédup, les ScrapeRuns et l'expiration sont fournis
   par l'orchestrateur.
3. L'ajout du module au tableau `SOURCES` de `scripts/ingest-offres.ts`.
