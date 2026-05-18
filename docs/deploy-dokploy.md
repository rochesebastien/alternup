# Déploiement sur Dokploy

## Vue d'ensemble

L'app tourne en monolithe (Nuxt 3 + Nitro) avec un Postgres self-hosted, le tout orchestré par `docker-compose.yml`.

## Variables d'environnement requises

| Variable | Description | Exemple |
|---|---|---|
| `DATABASE_URL` | URL de connexion Postgres lue par Prisma | `postgresql://alternup:STRONG_PWD@postgres:5432/alternup` |
| `NUXT_SESSION_PASSWORD` | Clé secrète pour signer les cookies de session (min. 32 caractères) | `openssl rand -base64 48` |
| `POSTGRES_USER` | Utilisateur Postgres (utilisé par le service `postgres` du compose) | `alternup` |
| `POSTGRES_PASSWORD` | Mot de passe Postgres | `STRONG_PWD` |
| `POSTGRES_DB` | Nom de la base | `alternup` |
| `APP_PORT` | Port exposé pour l'app Nuxt (par défaut 3000) | `3000` |
| `APP_VERSION` | Version applicative exposée via `/api/health` | `1.0.0` |

## Première mise en route

1. Dans Dokploy, créer un nouveau projet « Docker Compose ».
2. Pointer le repo Git sur la branche cible (`dev` ou `main` selon l'environnement).
3. Renseigner les variables d'environnement ci-dessus.
4. Déployer : Dokploy va `docker compose up -d --build`.

Le conteneur `alternup` exécute automatiquement `prisma migrate deploy` au démarrage (voir `Dockerfile`), donc le schéma est appliqué dès la première mise en route et sur chaque release contenant une nouvelle migration.

## Vérification

- `GET /api/health` → `{ "status": "ok", "version": "...", "environment": "production", ... }`
- Les logs `prisma migrate deploy` doivent indiquer `Applied X migrations` (ou `No pending migrations`).

## Maintenance

- **Logs** : `docker compose logs -f alternup`
- **Shell Postgres** : `docker compose exec postgres psql -U alternup alternup`
- **Reset DB (DEV uniquement)** : `docker compose down -v` puis redémarrer.

## Sauvegardes

Configurer un job de backup périodique sur le volume `postgres_data` via Dokploy (ou un cron externe avec `pg_dump`). Le volume est nommé pour rester persistant entre les redéploiements.
