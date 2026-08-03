# Alternup - Gérez vos alternances

![Image Description](docs/readme_cover.jpg)

<center>

[![CI](https://github.com/rochesebastien/alternup/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/rochesebastien/alternup/actions/workflows/ci.yml)  
[![Nuxt](https://img.shields.io/badge/Nuxt-00DC82?style=for-the-badge&logo=nuxtdotjs&logoColor=white)](https://nuxt.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

</center>



Solution **Nuxt 3** permettant aux tuteurs de suivre et gérer leurs étudiants en alternance (et stagiaires). Application monolithique avec **PostgreSQL** (Prisma) côté données, **nuxt-auth-utils** pour la session et **Tailwind CSS** pour l'UI. Déploiement cible : **Dokploy**.


## Structure du projet

```
alternup/
├── components/            # Composants Vue partagés
├── pages/                 # Pages Nuxt (routing automatique)
├── server/
│   ├── api/               # Routes API Nitro
│   │   └── auth/          # register / login / logout / me
│   └── utils/             # prisma.ts (singleton), require-role.ts
├── prisma/
│   ├── schema.prisma      # Modèle de données
│   └── migrations/        # Migrations Prisma générées
├── prisma.config.ts       # Config Prisma 7 (DATABASE_URL)
├── types/                 # Augmentations TypeScript (auth, etc.)
├── docs/                  # Documentation projet (déploiement, etc.)
├── docker-compose.yml     # Stack Postgres + app
└── Dockerfile             # Build multi-stage Nuxt
```

## Prérequis

- Node.js ≥ 18
- Docker + Docker Compose (pour la stack locale ou Dokploy)

## Variables d'environnement

Copier `.env.example` vers `.env` :

```bash
DATABASE_URL=postgresql://alternup:alternup@localhost:5432/alternup
NUXT_SESSION_PASSWORD=<32+ caractères aléatoires>
APP_VERSION=1.0.0
```

Génération rapide d'un secret de session :

```bash
openssl rand -base64 48
```

## Développement local

La stack Docker Compose (`docker-compose.yml`) embarque l'app + Postgres dans un seul `docker compose up`. C'est le mode recommandé pour le dev local.

```bash
# 1. Démarrer Postgres
docker compose up -d postgres

# 2. Installer les deps
npm install

# 3. Appliquer les migrations Prisma
npx prisma migrate dev

# 4. Lancer le serveur Nuxt (port 3000)
npm run dev
```

Vérification : http://localhost:3000/api/health

> Variante 100 % conteneurisée : `docker compose up -d --build` lance app + Postgres, applique les migrations au démarrage et expose l'app sur le port configuré par `APP_PORT` (3000 par défaut).

## Commandes utiles

```bash
npm run dev          # Serveur Nuxt avec HMR
npm run build        # Build production
npm run start        # Démarrer le build
npm run lint         # ESLint
npm run lint:fix     # ESLint --fix
npm test             # Vitest
npx prisma studio    # GUI sur la base
npx prisma migrate dev --name <slug>   # Nouvelle migration
```

## Production / Déploiement Dokploy

En production, l'app et Postgres sont déployés comme **deux ressources Dokploy distinctes** (Application + Database), pas via `docker-compose.yml`. Le guide complet : [`docs/deploy-dokploy.md`](docs/deploy-dokploy.md).

Le `docker-compose.yml` du repo n'est **utilisé qu'en dev local** — ne pas l'utiliser tel quel sur Dokploy.

## License

You may use, modify and contribute to this project for personal, non-commercial purposes.
For more details, read the [LICENSE](LICENSE) file.

---
© Roche Sébastien
