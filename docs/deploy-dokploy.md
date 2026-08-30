# Déploiement sur Dokploy (services séparés)

Ce guide décrit le déploiement **recommandé** sur Dokploy : la base Postgres et l'app Nuxt sont **deux ressources Dokploy distinctes** dans un même projet. C'est plus propre que tout regrouper dans un compose : on bénéficie des backups Postgres natifs de Dokploy, on peut redéployer l'app sans toucher à la DB, et on n'expose aucun port Postgres sur l'hôte.

> Pour le **dev local**, garder le `docker-compose.yml` du repo — voir la section dédiée du `README.md`.

## Vue d'ensemble

Le conteneur applicatif :

- est construit en **multi-stage** depuis `node:22-alpine` (build Nuxt + Nitro, puis runtime avec les seules deps de production) ;
- tourne sous un utilisateur non-root (uid 10001) ;
- applique automatiquement `prisma migrate deploy` au démarrage (CMD du Dockerfile) — aucune commande à lancer à la main ;
- écoute sur le port **3000** et expose un healthcheck Docker sur `GET /api/health`, utilisé par Dokploy pour redémarrer un conteneur qui ne répond plus.

## CI

`.github/workflows/ci.yml` exécute, sur chaque PR ciblant `dev`/`main` et chaque push sur ces branches :

- `npm ci`
- `prisma generate`
- `nuxt prepare`
- `vue-tsc --noEmit` (typecheck)
- `npm test` (vitest, suite partagée)
- `nuxt build` (build complet Nitro + client)

Le workflow ne déploie pas — Dokploy écoute le repo Git séparément et redéploie quand la branche cible évolue (Auto Deploy activable sur la ressource Application).

---

## 1. Service Postgres (« Database » Dokploy)

Dans le projet Dokploy : **Create Service → Database → PostgreSQL**.

| Champ Dokploy | Valeur | Notes |
|---|---|---|
| Name | `postgres-alternup` (libre) | C'est ce nom qui sert d'hôte dans `DATABASE_URL` |
| Image / Version | `postgres:16-alpine` | Cohérent avec le `docker-compose.yml` local |
| Database User | `alternup` | Libre |
| Database Password | `<mot de passe fort>` (≥ 20 chars) | Générer avec `openssl rand -base64 24` |
| Database Name | `alternup` | Libre |
| Internal port | `5432` | Default Postgres |
| External Port | **laisser vide** | L'app accède en interne ; éviter d'exposer Postgres publiquement |

Une fois la base **Deployed** (statut healthy), Dokploy affiche l'**Internal hostname** — c'est généralement `<service-name>` (par exemple `postgres-alternup`). C'est cette valeur qui ira dans `DATABASE_URL` de l'app.

> ⚠️ Si Dokploy refuse de démarrer la base, vérifier en premier qu'aucune autre Postgres du même projet n'utilise déjà le même *External Port* (cf. logs : `port is already allocated`).

## 2. Service Nuxt (« Application » Dokploy depuis le Dockerfile)

Dans le **même** projet Dokploy : **Create Service → Application**.

| Champ Dokploy | Valeur |
|---|---|
| Source | **GitHub** (repo `rochesebastien/alternup`) |
| Branch | `main` (prod) ou `dev` (staging) |
| Build Type | **Dockerfile** |
| Dockerfile Path | `Dockerfile` (à la racine) |
| Container Port | `3000` |
| Auto Deploy | activé pour redéployer sur chaque push de la branche |

### Variables d'environnement à créer sur ce service

| Variable | Valeur | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://alternup:<MOT_DE_PASSE>@postgres-alternup:5432/alternup` | **L'hôte = le nom du service Postgres dans le même projet Dokploy.** Pas `localhost`. |
| `NUXT_SESSION_PASSWORD` | `<32+ chars>` via `openssl rand -base64 48` | Sans ça, `nuxt-auth-utils` refuse de signer les cookies de session |
| `NODE_ENV` | `production` | |
| `APP_VERSION` | `1.0.0` (ou commit SHA) | Surface via `/api/health`, utile pour vérifier la version déployée |

### Variables optionnelles

| Variable | Quand la poser |
|---|---|
| `NUXT_SESSION_COOKIE_SECURE` | À `false` **uniquement** si le service est exposé en HTTP simple (test derrière une IP, pas encore de domaine ni de certificat). Sinon le navigateur jette le cookie de session et la connexion semble « ne rien faire ». À retirer dès que HTTPS est en place. |
| `TEMP_LOGIN` / `TEMP_PASS` / `TEMP_ROLE` | Staging seulement. Crée — ou réaligne à chaque démarrage — un compte de test (`server/plugins/temp-account.ts`). `TEMP_LOGIN` doit être une adresse e-mail ; `TEMP_ROLE` vaut `Tutor` (défaut), `Alternant` ou `Stagiaire`. Changer `TEMP_PASS` puis redéployer suffit à changer le mot de passe. **Ne jamais renseigner en production.** |

**Pas besoin** de :

- `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` → ils sont sur le service Postgres uniquement.
- `APP_PORT` → c'est une variable compose-only (mapping port hôte).
- Lancer `prisma migrate deploy` à la main → la CMD du Dockerfile le fait au démarrage.

## 3. Première mise en route

1. **Deploy** le service Postgres → attendre statut *healthy*.
2. **Deploy** le service Nuxt → suivre les logs. On doit lire successivement :
   ```
   Applied X migrations  (ou No pending migrations)
   Listening on http://[::]:3000
   ```
3. Sur l'URL publique exposée par Dokploy, `GET /api/health` doit renvoyer :
   ```json
   { "status": "ok", "version": "1.0.0", "environment": "production", ... }
   ```

## 4. Veille d'offres (ingestion quotidienne)

Le module de veille (page `/alternant/offres`) est alimenté par le script
`scripts/ingest-offres.ts`, exécuté **dans le conteneur de l'app** par un Schedule Job
Dokploy (ADR-0003). Doc d'exploitation complète : [`docs/veille.md`](veille.md).

### Variables d'environnement à ajouter sur le service Nuxt

| Variable | Requis | Valeur / Notes |
|---|---|---|
| `LBA_API_KEY` | ✅ (pour l'ingestion) | Jeton Bearer de l'API Apprentissage — clé de **production** créée sur [api.apprentissage.beta.gouv.fr](https://api.apprentissage.beta.gouv.fr). Sans elle, le run échoue (l'app web, elle, fonctionne normalement). |
| `ALERTE_WEBHOOK_URL` | — | Si renseignée, le script POSTe un JSON minimal (sujet, sources en échec, messages, date) quand au moins une source échoue. Absente = aucune alerte ; l'échec reste visible via le statut du job Dokploy et les `ScrapeRun` en base. |

### Créer le Schedule Job Dokploy

Sur la page du **service Application** (l'app Nuxt), onglet **Schedules** → **Create
Schedule** :

| Champ Dokploy | Valeur | Notes |
|---|---|---|
| Type | **Application** | Dokploy exécute la commande via `docker exec` dans le conteneur qui tourne — mêmes env vars, même client Prisma, même réseau que l'app |
| Task Name | `ingest-offres` (libre) | |
| Schedule (cron) | `30 3 * * *` | **Heure UTC serveur** = 4h30/5h30 Paris, après la régénération du dump LBA (3h00 Paris) |
| Command | `node scripts/ingest-offres.ts` | Type stripping natif de Node ≥ 22.18, aucun flag |
| Enabled | ✅ | |

Chaque exécution produit **une entrée de log dédiée** dans l'UI Dokploy (onglet du
Schedule) : le script y détaille source par source les compteurs (vues / créées / mises à
jour / expirées). Un code de sortie `1` (au moins une source en échec) marque l'exécution
en échec dans Dokploy. Relance manuelle : bouton *Run* du Schedule, ou la même commande
depuis le terminal conteneur (voir `docs/veille.md`).

### Migrations et healthcheck

Rien à faire de plus : le `prisma migrate deploy` du démarrage (CMD du Dockerfile)
applique les 3 migrations du module au premier redéploiement
(`split_espaces_notification_links`, `veille_offres`, `offres_trgm_indexes` — cette
dernière active l'extension `pg_trgm`, incluse dans `postgres:16-alpine`). Le healthcheck
`GET /api/health` est inchangé.

## 5. Maintenance

- **Logs app** : panneau *Logs* du service Nuxt dans Dokploy (ou `docker logs -f <container>` côté hôte).
- **Shell Postgres** : depuis la page du service Database, Dokploy expose une console `psql` directe.
- **Reset DB (staging uniquement)** : supprimer le volume Postgres depuis la page du service, puis redéployer l'app — la première instance ré-appliquera toutes les migrations.

## 6. Sauvegardes

Configurer le **backup natif Dokploy** sur la ressource Postgres (interface *Backups*) : fréquence + retention + destination (S3 / FTP / etc.). Plus simple qu'un `pg_dump` en cron, et restauration en un clic.

## 7. Gotchas

- **Hostname Postgres** = **toujours** le nom du service Dokploy. Jamais `localhost`, jamais l'IP publique.
- **Services dans des projets Dokploy différents** : ils ne se voient pas par défaut (réseaux Docker isolés). Les garder dans le même projet.
- **Première migration qui échoue** (Postgres pas encore prêt au boot de l'app) : `prisma migrate deploy` est idempotent — redéployer le service Nuxt résout le problème.
- **Conflit de port Postgres** : si une autre base Dokploy tourne déjà avec un *External Port* identique, le nouveau service refuse de démarrer. Solution : laisser *External Port* vide (l'app utilise le réseau interne).
