# Alternup - Gérez vos alternances

![Image Description](docs/readme_cover.jpg)

<center>

[![CI](https://github.com/rochesebastien/alternup/actions/workflows/ci.yml/badge.svg?branch=dev)](https://github.com/rochesebastien/alternup/actions/workflows/ci.yml)  
[![Nuxt](https://img.shields.io/badge/Nuxt_4-00DC82?style=for-the-badge&logo=nuxtdotjs&logoColor=white)](https://nuxt.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

</center>



Application **Nuxt 4** monolithique permettant aux tuteurs de suivre et gérer leurs étudiants
en alternance (et stagiaires) : réseau tuteur ↔ apprenants, projets et missions, cours et
notes, calendrier, présences et pointage journalier, rapports d'étape, bulletins périodiques,
visites tuteur, référentiel de compétences, messagerie, annonces, notifications et signatures
de documents.

Front et API vivent dans la même base de code : **Nuxt** rend les pages, **Nitro** sert l'API,
**Prisma** parle à **PostgreSQL** et **nuxt-auth-utils** gère la session.
Déploiement cible : **Dokploy**.

## Stack technique

| Domaine | Choix |
|---|---|
| Framework | **Nuxt 4.4** (SSR) + **Vue 3.5** + `vue-router` 5 |
| Langage | **TypeScript 6** (`strict`), typecheck via `vue-tsc` |
| Runtime | **Node ≥ 22** |
| UI | **Nuxt UI 4** + **Tailwind CSS 4** (config CSS-first dans `assets/css/main.css`) |
| Icônes / police | `@nuxt/icon` + `@iconify-json/lucide`, **Mona Sans** self-hostée — aucun fetch réseau au runtime |
| Images | `@nuxt/image` (provider `ipx`) |
| État | **Pinia**, **VueUse** |
| Calendrier | **Schedule-X 4** (thème shadcn) + `temporal-polyfill` |
| Animation | **GSAP** |
| API | **Nitro** — ~108 routes sous `server/api/` |
| ORM / base | **Prisma 7** (`@prisma/adapter-pg`) sur **PostgreSQL 16** — 27 modèles, 9 enums |
| Auth | **nuxt-auth-utils** (cookie de session signé) + **bcrypt** |
| Validation | **Zod 4** (messages en français) |
| Qualité | **ESLint 10**, **Vitest 4**, Husky + lint-staged |
| CI / déploiement | GitHub Actions · **Docker** multi-stage · **Dokploy** |

## Structure du projet

```
alternup/
├── app.vue                # Shell applicatif (nav, dock, layout)
├── app.config.ts          # Config Nuxt UI (thème, toasts)
├── pages/                 # Pages Nuxt (routing automatique)
├── components/            # Composants Vue (à plat — cf. note ci-dessous)
├── composables/           # useLearnerFocus, useNotificationCountState
├── middleware/            # auth.global.ts, role.ts
├── plugins/               # gsap.client.ts, zod-locale.ts
├── assets/                # main.css (design tokens Tailwind 4), logos, favicon
├── shared/utils/          # Logique métier partagée client + serveur (dont enums.ts)
├── server/
│   ├── api/               # Routes API Nitro (auth, présences, bulletins, compétences…)
│   ├── middleware/        # auth-guard.ts (garde globale sur /api)
│   ├── plugins/           # temp-account.ts, zod-locale.ts
│   └── utils/             # prisma.ts (singleton), require-role.ts, helpers métier
├── prisma/
│   ├── schema.prisma      # Modèle de données
│   └── migrations/        # Migrations Prisma générées
├── prisma.config.ts       # Config Prisma 7 (DATABASE_URL)
├── types/                 # Augmentations TypeScript (auth, gsap, temporal…)
├── tests/shared/          # Suite Vitest (logique de shared/utils)
├── taches/                # Journal de plans, revues et leçons
├── docs/                  # Documentation projet (déploiement)
├── docker-compose.yml     # Stack Postgres + app (dev local)
└── Dockerfile             # Build multi-stage Nuxt
```

> Deux points à connaître avant de créer un fichier :
> - Il n'y a **pas de dossier `app/`** : Nuxt 4 conserve donc la structure v3 (dossiers à la racine).
> - Les composants sont **à plat** dans `components/` : Nuxt préfixe le nom d'un composant par
>   son sous-dossier (`components/stats/StatCard.vue` → `<StatsStatCard>`), et ni le typecheck
>   ni le build ne signalent une référence erronée.

## Prérequis

- Node.js ≥ 22
- Docker + Docker Compose (pour la stack locale ou Dokploy)

## Variables d'environnement

Copier `.env.example` vers `.env` :

| Variable | Requis | Rôle |
|---|---|---|
| `DATABASE_URL` | ✅ | URL Postgres lue par Prisma |
| `NUXT_SESSION_PASSWORD` | ✅ | Secret de signature des cookies de session (≥ 32 caractères) |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | compose | Init du conteneur Postgres (dev local uniquement) |
| `APP_PORT` | — | Port exposé sur l'hôte par compose (le conteneur écoute toujours sur 3000) |
| `APP_VERSION` | — | Version renvoyée par `/api/health` |
| `NODE_ENV` | — | `development` en local, `production` en déploiement |
| `NUXT_SESSION_COOKIE_SECURE` | — | Poser `false` uniquement si l'app est exposée en HTTP simple, sinon le navigateur jette le cookie |
| `TEMP_LOGIN` / `TEMP_PASS` / `TEMP_ROLE` | — | Compte de test recréé/réaligné à chaque démarrage (`server/plugins/temp-account.ts`). À laisser vide hors staging |

Génération rapide d'un secret de session :

```bash
openssl rand -base64 48
```

## Développement local

La stack Docker Compose (`docker-compose.yml`) embarque l'app + Postgres dans un seul
`docker compose up`. C'est le mode recommandé pour le dev local.

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
npm run build        # Build production (Nuxt + Nitro)
npm run preview      # Prévisualiser le build
npm run start        # Démarrer le build
npm run lint         # ESLint
npm run lint:fix     # ESLint --fix
npm test             # Vitest (run unique)
npm run test:watch   # Vitest en watch

npx vue-tsc --noEmit                   # Typecheck (identique à la CI)
npx prisma studio                      # GUI sur la base
npx prisma migrate dev --name <slug>   # Nouvelle migration
```

## Intégration continue

`.github/workflows/ci.yml` s'exécute sur chaque PR ciblant `dev`/`main` et chaque push sur
ces branches : `npm ci` → `prisma generate` → `nuxt prepare` → `vue-tsc --noEmit` →
`npm test` → `nuxt build`. Le workflow ne déploie pas.

## Production / Déploiement Dokploy

En production, l'app et Postgres sont déployés comme **deux ressources Dokploy distinctes** (Application + Database), pas via `docker-compose.yml`. Le guide complet : [`docs/deploy-dokploy.md`](docs/deploy-dokploy.md).

Le `docker-compose.yml` du repo n'est **utilisé qu'en dev local** — ne pas l'utiliser tel quel sur Dokploy.

## Contribuer

- `main` est la branche de release, `dev` la branche d'intégration : **toutes les PR ciblent `dev`**.
- Les branches feature partent de `dev` et suivent le format `<numéro>-<slug>`.
- Conventions de code et règles issues d'incidents passés : [`CLAUDE.md`](CLAUDE.md) et [`taches/lecons.md`](taches/lecons.md).

## License

You may use, modify and contribute to this project for personal, non-commercial purposes.
For more details, read the [LICENSE](LICENSE) file.

---
© Roche Sébastien
