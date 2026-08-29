# Phase 0-E — Firecrawl v2 & scheduling d'une ingestion quotidienne

> Recherche effectuée le **2026-08-29** sur les documentations officielles (docs.firecrawl.dev,
> firecrawl.dev/pricing, nitro.build, docs.dokploy.com). Les points non vérifiables sont
> signalés explicitement.

## Synthèse

- **Firecrawl v2** est l'API courante (`https://api.firecrawl.dev/v2/...`). Un scrape simple
  coûte **1 crédit/page** ; l'extraction JSON avec schema ajoute **+4 crédits** (total 5) ;
  `/map` coûte **1 crédit par appel** quel que soit le nombre d'URLs retournées. Le surcoût
  « stealth ×5 » **n'existe plus** : le proxy est désormais `basic`/`enhanced`/`auto`, et la
  doc officielle affirme que l'enhanced coûte le même prix que le basic (1 crédit).
- **Plans** : Free = 1 000 crédits/mois (sans CB), Hobby = 16 $/mois (facturation annuelle)
  pour 5 000 crédits/mois.
- **SDK Node officiel** : le package npm actuel est **`firecrawl`** (v4.x) ; `@mendable/firecrawl-js`
  existe toujours mais la doc officielle installe `firecrawl`.
- Le **pattern incrémental** `/map` → diff en base → `/scrape` des seules nouveautés est le
  bon : 1 crédit de map + 5 crédits par offre réellement nouvelle. Le cache `maxAge` accélère
  mais **ne fait pas économiser de crédits** (un hit de cache est facturé 1 crédit).
- **Scheduling** : les Nitro tasks sont **toujours expérimentales** (août 2026) mais
  fonctionnent en preset `node-server` (moteur croner) — donc dans notre conteneur Docker
  long-running. Dokploy offre nativement des **Schedule Jobs** de type « Application » qui
  exécutent une commande **dans le conteneur en marche via `docker exec`**, avec cron 5 champs
  et log par exécution.
- **Recommandation confirmée** : script d'ingestion isolé (hors requête HTTP), lancé par un
  Schedule Job Dokploy (`docker exec`), relançable à la main — détails et réserves en fin de
  rapport.

---

## Firecrawl v2

### Endpoints

#### `POST https://api.firecrawl.dev/v2/map` — découverte d'URLs

Auth : `Authorization: Bearer fc-...`. Retourne les URLs connues d'un site (sitemap + SERP +
pages déjà crawlées par Firecrawl). Privilégie la vitesse : la doc avertit qu'il peut manquer
des liens (utiliser `/crawl` pour l'exhaustivité).

Paramètres principaux :

| Paramètre | Type | Défaut | Rôle |
|---|---|---|---|
| `url` | string | **requis** | racine à cartographier |
| `search` | string | — | filtre de pertinence (ex. `"alternance"`) |
| `limit` | int | 5000 (max 100 000) | nb max d'URLs retournées |
| `sitemap` | enum `skip`/`include`/`only` | `include` | stratégie sitemap |
| `includeSubdomains` | bool | `true` | inclure les sous-domaines |
| `ignoreQueryParameters` | bool | `true` | déduplique les URLs à query string |
| `ignoreCache` | bool | `false` | contourne le cache map (~7 jours) |
| `location` | object | US | pays / langues (utile pour sites FR) |

```bash
curl -X POST https://api.firecrawl.dev/v2/map \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://exemple-jobboard.fr","search":"alternance","limit":2000,"includeSubdomains":false}'
```

Réponse : `{ "success": true, "links": [ { "url", "title", "description" } ] }`.

**Coût** : « Each map request consumes 1 credit per call, regardless of the number of URLs
returned. » (doc feature Map).

#### `POST https://api.firecrawl.dev/v2/scrape` — scrape d'une page

Paramètres clés : `url` (requis), `formats` (défaut `["markdown"]` ; aussi `html`, `rawHtml`,
`links`, `screenshot`, `summary`, `changeTracking`…), `onlyMainContent` (défaut `true`),
`maxAge` (défaut 172 800 000 ms = 2 jours), `proxy` (`basic`/`enhanced`/`auto`, défaut `auto`),
`actions` (click/wait/scroll pré-scrape), `waitFor`, `timeout` (défaut 60 s, max 300 s).

**Extraction JSON avec schema** : passer un objet dans `formats` :

```bash
curl -X POST https://api.firecrawl.dev/v2/scrape \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://exemple-jobboard.fr/offre/123",
    "formats": [{
      "type": "json",
      "prompt": "Extrais l offre d alternance",
      "schema": {
        "type": "object",
        "properties": {
          "titre": {"type": "string"},
          "entreprise": {"type": "string"},
          "ville": {"type": "string"},
          "datePublication": {"type": "string"}
        },
        "required": ["titre"]
      }
    }],
    "onlyMainContent": true,
    "proxy": "auto"
  }'
```

Le `schema` est du **JSON Schema** standard ; `prompt` est optionnel (schema seul suffit).
Option `checkPromptInjection` disponible.

#### `POST https://api.firecrawl.dev/v2/crawl` — crawl complet (job asynchrone)

Crawl d'un site entier avec `scrapeOptions` par page ; job asynchrone à poller. Facturé
1 crédit/page scrapée. Pour notre besoin (offres nouvelles seulement), `/map` + `/scrape`
ciblés reste plus économe.

#### `POST https://api.firecrawl.dev/v2/extract` — extraction agentique multi-pages (**Beta**)

Accepte des URLs multiples ou des wildcards (`example.com/*`), un `prompt` et/ou `schema`,
option `enableWebSearch`. Facturation en crédits : « Each credit is worth 15 tokens » —
coût **variable et peu prévisible**, résultats accessibles 24 h. À éviter pour un pipeline
budgété ; préférer `/scrape` en JSON mode.

### Coûts en crédits (vérifiés sur la doc et le pricing officiels, 2026-08-29)

| Opération | Coût | Source |
|---|---|---|
| Scrape simple (markdown/html) | **1 crédit / page** (« Each scrape consumes 1 credit ») | docs `features/scrape` |
| Format `json` (extraction schema) | **+4 crédits / page** → 5 au total | docs `features/scrape` |
| Formats `question` / `highlights` | +4 crédits / page / format | docs `features/scrape` |
| PDF | 1 crédit / page PDF | docs `features/scrape` |
| Hit de cache (`maxAge`) | **toujours 1 crédit** (« Caching improves speed, not credit usage ») | docs `features/fast-scraping` |
| Proxy `enhanced` (ex-stealth) | **1 crédit — même prix que basic** : « Enhanced proxy requests now cost the same as basic requests — 1 credit per request » | docs `features/stealth-mode` |
| `/map` | **1 crédit / appel** | docs `features/map` |
| `/crawl` | 1 crédit / page | pricing officiel |
| `/search` | 2 crédits / 10 résultats | pricing officiel |

> Le surcoût stealth ×5 évoqué dans la mission est **périmé** : la page officielle
> « stealth-mode » documente désormais `basic`/`enhanced`/`auto` au même prix
> (1 crédit), `auto` réessayant en enhanced après échec du basic, sans surfacturation.

### Plans (firecrawl.dev/pricing, consulté le 2026-08-29)

| Plan | Prix | Crédits/mois | Rate limit `/scrape` & `/map` | Navigateurs concurrents |
|---|---|---|---|---|
| **Free** | 0 $ (sans CB) | **1 000** | 10 req/min | 2 |
| **Hobby** | **16 $/mois** (facturé annuellement) | **5 000** | 100 req/min | 5 |
| Standard | 83 $/mois (annuel) | 100 000 | 500 req/min | 25 |
| Growth | 333 $/mois (annuel) | 500 000 | 5 000 req/min | 50 |

Le prix Hobby en facturation **mensuelle** n'est pas affiché sur la page consultée
(seul le tarif annualisé 16 $/mois est visible) — à vérifier dans le dashboard au moment
de souscrire. Auto-recharge : 5 $ par lot (1 000 crédits en Hobby).

### SDK Node officiel

- Package npm actuel : **`firecrawl`** (`npm install firecrawl`), v4.x. C'est celui que la
  doc officielle (`docs.firecrawl.dev/sdks/node`) installe. `@mendable/firecrawl-js` est
  l'ancien nom, toujours publié (v4.30 au 2026-08) et plus téléchargé historiquement, mais
  la référence officielle est `firecrawl`.
- Usage :

```ts
import { Firecrawl } from 'firecrawl'

const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY })

const { links } = await firecrawl.map('https://exemple-jobboard.fr', { limit: 2000 })
const doc = await firecrawl.scrape('https://exemple-jobboard.fr/offre/123', {
  formats: [{ type: 'json', schema: {/* JSON Schema */} }]
})
```

- Aucune version Node minimale documentée ; Node 22 (notre runtime) ne pose aucun problème.
  Le SDK est un simple client HTTP : utilisable dans un script isolé comme dans du code Nitro.

### Pattern incrémental économe (recommandé)

1. **`/map` quotidien** par site source (1 crédit/site/jour), éventuellement avec `search`
   pour restreindre aux pages d'offres, `includeSubdomains: false` et `location: { country: "FR" }`.
2. **Diff en base** : comparer `links[].url` avec les URLs déjà ingérées (table Postgres avec
   index unique sur l'URL normalisée). Zéro crédit.
3. **`/scrape` JSON uniquement des nouveautés** : 5 crédits/offre nouvelle (1 + 4 JSON).
4. Marquer les URLs disparues du map comme potentiellement expirées (zéro crédit).

Budget indicatif : 3 sites suivis, ~10 nouvelles offres/jour au total →
3 crédits de map + 50 crédits de scrape ≈ **~1 600 crédits/mois** → au-dessus du Free
(1 000), confortable en Hobby (5 000). Avec 1–2 sites ou moins de nouveautés, le Free suffit.

Notes cache :
- `maxAge` (défaut 2 jours) ne réduit **pas** la facture — seulement la latence. Le laisser
  au défaut est sans risque pour des offres (contenu d'une offre déjà publiée ~statique) ;
  mettre `maxAge: 0` seulement si la fraîcheur au scrape près compte.
- Le cache de `/map` (~7 jours, contournable par `ignoreCache: true`) peut retarder
  l'apparition de nouvelles URLs : si le map quotidien semble figé, poser `ignoreCache: true`.
- Le format `changeTracking` de `/scrape` existe pour détecter des changements de contenu,
  mais pour « détecter les nouvelles offres » le diff d'URLs côté base reste le plus simple
  et le moins cher.

---

## Scheduling d'une ingestion quotidienne

### Option A — Nitro tasks (`scheduledTasks` in-process)

État vérifié sur `nitro.build/docs/tasks` (2026-08-29) :

- **Statut : toujours expérimental** — « Tasks support is currently experimental »
  (discussion nitrojs/nitro#1974). Activation : `nitro: { experimental: { tasks: true } }`
  dans `nuxt.config.ts`.
- Définition : `server/tasks/<name>.ts` avec `defineTask({ meta, run })` (dossiers imbriqués
  → noms `ingest:offers`).
- Planification : `nitro: { scheduledTasks: { '0 5 * * *': ['ingest:offers'] } }`. Presets
  supportés : **dev, node_server** (notre cas — moteur croner embarqué), node_cluster, bun,
  deno_server, plus intégrations natives Cloudflare/Vercel. **Fonctionne donc dans un
  serveur Node long-running en production** — le cron vit dans le process Nitro.
- Exécution manuelle : en **dev seulement** via `/_nitro/tasks/:name` ou `nitro task run` ;
  en **production il n'y a pas d'endpoint intégré** — il faut exposer soi-même un handler
  appelant `runTask('ingest:offers', { payload })`.
- Garantie utile : « Each task can have one running instance » (pas de double exécution
  concurrente du même nom).

Limites pour nous : statut expérimental (API susceptible de changer entre versions Nitro
poussées par Nuxt), cron couplé au cycle de vie du serveur web (un redéploiement Dokploy en
pleine ingestion tue la tâche ; en multi-instance chaque réplique déclencherait son cron),
logs mélangés à ceux du serveur, relance manuelle en prod à construire soi-même.

### Option B — Script isolé + Dokploy Schedule Job (recommandée par la mission)

Vérifié sur `docs.dokploy.com/docs/core/schedule-jobs` (2026-08-29) :

- Dokploy a une fonctionnalité native **Schedule Jobs** (livrée en v0.22.0) avec quatre
  types : **« Application Jobs: Run commands inside specific application containers »**,
  Compose Jobs, Server Jobs, Dokploy Server Jobs.
- Pour un job **Application** : « Dokploy internally uses Docker exec to run these
  commands » (`docker exec <container> <command>`). **Le conteneur doit être en marche**
  (le nôtre l'est en permanence).
- Format : **expressions cron 5 champs** (exemples type `*/15 * * * *` dans la doc).
- **Chaque exécution crée une entrée de log** consultable dans l'UI Dokploy (sortie +
  statut). La doc recommande de tester la commande à la main avant de la planifier.
- Un bouton « run now » n'est pas documenté explicitement sur la page consultée ; en
  pratique la relance manuelle est toujours possible par `docker exec` sur l'hôte, ou en
  lançant la même commande depuis le terminal conteneur de l'UI Dokploy.

Contraintes côté conteneur (vérifiées dans notre `Dockerfile`) : le runtime contient les
**deps de production + client Prisma généré**, mais **pas les devDeps** (pas de tsx/jiti) et
pas les alias Nuxt (`~`, `#imports`). Le script doit donc être autonome :

- soit un **`.mjs`/`.ts` sans alias** importan­t `@prisma/client` + le SDK `firecrawl` en
  chemins relatifs — **Node 22.18+ exécute nativement les `.ts`** (type stripping activé par
  défaut, `node scripts/ingest.ts` sans flag ; limites : pas d'`enum` TS runtime, pas de
  décorateurs — nos `shared/utils/enums.ts` sont des objets `const`, compatibles) ;
- soit compilé au build dans l'image (étape esbuild) si on veut s'affranchir des limites du
  type stripping.
- `firecrawl` devra passer en dépendance **de production** ; le script doit être `COPY`
  dans l'image runtime (`COPY scripts ./scripts` à ajouter au Dockerfile).

### Option C — Endpoint Nitro protégé par secret + cron externe

Un `server/api/internal/ingest.post.ts` vérifiant un header secret, appelé par le Schedule
Job Dokploy lui-même (`wget --header=... http://127.0.0.1:3000/api/internal/ingest` dans le
conteneur — pas besoin d'exposition publique) ou par un cron externe (GitHub Actions
schedule, cron-job.org…).

### Tableau comparatif

| Critère | A. Nitro `scheduledTasks` | B. Script isolé + Dokploy job | C. Endpoint secret + cron |
|---|---|---|---|
| Stabilité | ⚠️ expérimental | ✅ Node + cron Dokploy stables | ✅ stable |
| Accès Prisma / code partagé | ✅ total (contexte serveur) | ✅ `@prisma/client` direct ; `shared/` en relatif (pas d'alias) | ✅ total |
| Hors requête HTTP (pas de timeout) | ✅ | ✅ | ❌ timeout HTTP/proxy ; contournable en 202 + async mais on perd le statut d'échec |
| Logs dédiés | ❌ mêlés au serveur | ✅ log par exécution dans Dokploy | ~ logs serveur + statut HTTP |
| Relance manuelle | ❌ à construire (endpoint `runTask`) | ✅ `docker exec` / terminal Dokploy | ✅ simple curl |
| Survit à un redéploiement en cours | ❌ tué avec le process | ~ tué aussi si redeploy simultané, mais exécution visible en échec dans Dokploy | ❌ tué avec le process |
| Couplage au serveur web | fort | **faible** (même image, process séparé) | fort |
| Multi-instances | ⚠️ cron par réplique | ✅ un seul job | ✅ un seul appel |
| Mise en place | très simple | simple (script + job UI) | simple |

## Recommandation

**Confirmée : option B** — un script d'ingestion isolé (`scripts/ingest-offres.ts`, exécuté
par `node scripts/ingest-offres.ts` grâce au type stripping de Node 22.18+, ou pré-compilé),
déclenché quotidiennement par un **Schedule Job Dokploy de type Application** (cron 5 champs,
`docker exec` dans le conteneur en marche). C'est l'option qui coche tout : hors requête HTTP
(pas de timeout), accès direct à `@prisma/client` et au code `shared/` (en imports relatifs),
log dédié par exécution dans Dokploy, relance manuelle triviale, zéro dépendance à une
feature expérimentale, et aucun service supplémentaire.

Points d'implémentation à prévoir :
1. Ajouter `firecrawl` aux dependencies (prod) et `COPY scripts ./scripts` au Dockerfile.
2. Script idempotent (upsert par URL normalisée) + verrou simple en base (éviter deux runs
   concurrents si relance manuelle pendant le cron).
3. Ne pas utiliser d'alias Nuxt ni d'`enum` TS runtime dans le script (limites du type
   stripping) — nos conventions `shared/utils/` (objets const) sont déjà compatibles.
4. Fallback assumé : si les Schedule Jobs Dokploy posaient problème sur l'instance, l'option
   C (endpoint secret appelé en localhost par le job, réponse 202) est la roue de secours ;
   l'option A (Nitro tasks) reste écartée tant que la feature est marquée expérimentale.

## Sources (consultées le 2026-08-29)

- https://docs.firecrawl.dev/api-reference/endpoint/map — référence API v2 `/map`
- https://docs.firecrawl.dev/api-reference/endpoint/scrape — référence API v2 `/scrape`
- https://docs.firecrawl.dev/features/scrape — coûts crédits scrape / json / maxAge
- https://docs.firecrawl.dev/features/map — coût `/map` (1 crédit/appel)
- https://docs.firecrawl.dev/features/fast-scraping — cache `maxAge` (hit = 1 crédit)
- https://docs.firecrawl.dev/features/stealth-mode — proxy basic/enhanced/auto, fin du surcoût
- https://docs.firecrawl.dev/features/extract — `/extract` beta, crédit = 15 tokens
- https://docs.firecrawl.dev/rate-limits — rate limits et concurrence par plan
- https://www.firecrawl.dev/pricing — plans Free/Hobby/Standard, table des coûts
- https://docs.firecrawl.dev/sdks/node — SDK Node officiel (`npm install firecrawl`)
- https://www.npmjs.com/package/firecrawl et https://www.npmjs.com/package/@mendable/firecrawl-js — versions npm
- https://nitro.build/docs/tasks — Nitro tasks (statut expérimental, presets, runTask)
- https://docs.dokploy.com/docs/core/schedule-jobs — Schedule Jobs Dokploy (docker exec, cron, logs)
- https://dokploy.com/blog/v0-22-0-docker-compose-backups-schedule-tasks-logs — introduction de la feature
- https://nodejs.org/learn/typescript/run-natively — type stripping Node (défaut depuis 22.18.0)
