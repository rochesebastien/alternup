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

## 4. Maintenance

- **Logs app** : panneau *Logs* du service Nuxt dans Dokploy (ou `docker logs -f <container>` côté hôte).
- **Shell Postgres** : depuis la page du service Database, Dokploy expose une console `psql` directe.
- **Reset DB (staging uniquement)** : supprimer le volume Postgres depuis la page du service, puis redéployer l'app — la première instance ré-appliquera toutes les migrations.

## 5. Sauvegardes

Configurer le **backup natif Dokploy** sur la ressource Postgres (interface *Backups*) : fréquence + retention + destination (S3 / FTP / etc.). Plus simple qu'un `pg_dump` en cron, et restauration en un clic.

## 6. Gotchas

- **Hostname Postgres** = **toujours** le nom du service Dokploy. Jamais `localhost`, jamais l'IP publique.
- **Services dans des projets Dokploy différents** : ils ne se voient pas par défaut (réseaux Docker isolés). Les garder dans le même projet.
- **Première migration qui échoue** (Postgres pas encore prêt au boot de l'app) : `prisma migrate deploy` est idempotent — redéployer le service Nuxt résout le problème.
- **Conflit de port Postgres** : si une autre base Dokploy tourne déjà avec un *External Port* identique, le nouveau service refuse de démarrer. Solution : laisser *External Port* vide (l'app utilise le réseau interne).
