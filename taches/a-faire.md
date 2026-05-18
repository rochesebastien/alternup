# Plan en cours — Migration stack Supabase → Postgres + Prisma + nuxt-auth-utils (Dokploy)

> Branche : `claude/review-code-progress-fQMkQ`
> Objectif : retirer toute dépendance à Supabase (DB + Auth) et préparer un déploiement Dokploy avec Postgres self-hosted.
> Une fois cette migration terminée → reprendre l'issue #6 (CRUD alternants/stagiaires pour tuteur).

---

## État actuel à migrer

- **40+ routes** sous `server/api/` utilisent `event.context.supabase`
- **2 plugins Supabase** : `server/plugins/supabase.ts`, `plugins/supabase.client.ts`
- **2 utilitaires** : `utils/supabase.ts`, `types/supabase.ts`
- **6 migrations SQL** sous `supabase/migrations/` (référencent `auth.users`, RLS, `auth.uid()`)
- **Pages/composants** : `pages/alternants/*.vue`, `components/AlternantsList.vue` consomment via `useSupabaseClient()`
- **Config** : `nuxt.config.ts` (runtimeConfig SUPABASE_*), `docker-compose.yml`, `.env.example`

---

## Phase 0 — Préparation (no code change)

- [x] Inventaire des fichiers Supabase (cf. `git grep supabase`)
- [x] Choix de stack validé : Prisma, nuxt-auth-utils, Prisma Migrate
- [x] Décisions schéma validées : fusion User+Profile, init Prisma from scratch
- [ ] Validation finale du plan complet par l'utilisateur **← bloquant avant d'exécuter Phase 1**

## Phase 1 — Dépendances & config

- [x] `npm rm @supabase/supabase-js`
- [x] `npm i prisma @prisma/client bcrypt nuxt-auth-utils`
- [x] `npm i -D @types/bcrypt dotenv`
- [x] `prisma/schema.prisma` créé + `prisma.config.ts` (Prisma 7 : `url` dans config, pas dans schema)
- [x] Ajouter `nuxt-auth-utils` dans `nuxt.config.ts` (`modules`)
- [x] Retirer de `runtimeConfig` : `supabaseUrl`, `supabaseKey`, `jwtSecret`
- [x] Ajouter `runtimeConfig` : `databaseUrl`
- [x] Mettre à jour `.env.example` : `DATABASE_URL`, `NUXT_SESSION_PASSWORD`, retirer `SUPABASE_*`

## Phase 2 — Schéma Prisma (traduire les 6 migrations Supabase)

Modèles à créer dans `prisma/schema.prisma` :

**Décisions validées :**
- ✅ Fusion `User` + `Profile` en une seule table `User`
- ✅ Repartir de zéro avec `prisma migrate dev --name init` (historique Supabase abandonné)

Modèles :

- [x] `enum Role { Tutor Alternant Stagiaire }`
- [x] `enum ProjectStatus { non_demarre en_cours termine annule }`
- [x] `model User` — `id`, `email` unique, `passwordHash`, `role`, `firstName`, `lastName`, timestamps
- [x] `model TutorStudent` (PK composite tutorId+studentId, relations vers User)
- [x] `model Course`, `model CourseAssignment`, `model CourseNote`
- [x] `model Project`, `model ProjectAssignment`
- [x] `model CalendarEvent`
- [x] Schéma validé via `prisma validate` ✅
- [x] SQL généré vérifié via `prisma migrate diff` ✅
- [ ] **`npx prisma migrate dev --name init`** — sera lancé en Phase 7 quand Postgres tournera dans Docker
- [ ] Supprimer `supabase/` entier — sera fait en Phase 8 (nettoyage)

## Phase 3 — Connexion DB (remplacer le plugin Supabase serveur)

- [ ] Créer `server/utils/prisma.ts` : singleton `PrismaClient` (pattern HMR-safe)
- [ ] Supprimer `server/plugins/supabase.ts`
- [ ] Supprimer l'injection `event.context.supabase` (chaque route importera `prisma` directement)
- [ ] Supprimer `plugins/supabase.client.ts` (pas de client Supabase côté browser)
- [ ] Supprimer `utils/supabase.ts`
- [ ] Supprimer `types/supabase.ts` (les types viennent de `@prisma/client`)

## Phase 4 — Réécriture des routes API

Pour chaque route sous `server/api/`, remplacer `supabase.from(...).select/insert/update/delete` par l'équivalent Prisma. Méthodologie : 1 ressource = 1 commit pour faciliter la review.

- [ ] `health.get.ts` (juste retirer la dépendance supabase si présente)
- [ ] `profiles/` (5 routes) → `prisma.user.*` (table fusionnée)
- [ ] `tutor-students/` (5 routes) → `prisma.tutorStudent.*`
- [ ] `courses/` (5 routes) → `prisma.course.*`
- [ ] `course-assignments/` (5 routes)
- [ ] `course-notes/` (5 routes)
- [ ] `projects/` (5 routes)
- [ ] `project-assignments/` (5 routes)
- [ ] `calendar-events/` (5 routes)
- [ ] `alternants/` (2 routes) → vérifier si toujours pertinent vs `profiles?role=Alternant`

## Phase 5 — Auth minimale (pour que le schéma tienne debout)

> Objectif Phase 5 : avoir un système auth fonctionnel basique. Les écrans UI + flows complets restent dans l'issue #5/#14.

- [ ] `server/api/auth/register.post.ts` : email + password + role → bcrypt hash → `prisma.user.create` → `setUserSession`
- [ ] `server/api/auth/login.post.ts` : verify password → `setUserSession({ user: { id, role } })`
- [ ] `server/api/auth/logout.post.ts` : `clearUserSession`
- [ ] `server/utils/require-user.ts` : helper qui throw 401 si pas de session
- [ ] (Optionnel) seed Prisma : 1 tuteur + 2 alternants pour les tests manuels

## Phase 6 — Frontend : retirer Supabase client

- [ ] `pages/alternants/index.vue` : remplacer `useSupabaseClient()` par `$fetch('/api/alternants')`
- [ ] `pages/alternants/[id].vue` : idem
- [ ] `components/AlternantsList.vue` : idem
- [ ] Vérifier qu'aucun `useSupabase*` ne reste (`grep -r useSupabase`)

## Phase 7 — Docker / Dokploy

- [ ] `docker-compose.yml` : ajouter service `postgres:16-alpine`, volume, healthcheck
- [ ] `docker-compose.yml` : retirer `SUPABASE_*`, ajouter `DATABASE_URL`, `NUXT_SESSION_PASSWORD`
- [ ] `Dockerfile` : ajouter `RUN npx prisma generate` avant `npm run build`
- [ ] `Dockerfile` : multi-stage (deps → builder → runner) pour image plus légère
- [ ] Créer `docs/deploy-dokploy.md` : variables d'env, commande migrate (`prisma migrate deploy`), volumes
- [ ] Mettre à jour `README.md` : nouveau setup local (`docker compose up postgres`, `prisma migrate dev`, `npm run dev`)

## Phase 8 — Nettoyage

- [ ] Supprimer `MIGRATION_COMPLETE.md`
- [ ] Supprimer `MONOLITH_SUCCESS.md`
- [ ] Supprimer `supabase/MIGRATION_REPORT_*.md`
- [ ] Mettre à jour `docs/BACKEND_API_IMPLEMENTATION.md` (mentions Supabase)

## Phase 9 — Vérification

- [ ] `npx vue-tsc --noEmit` (typecheck) passe
- [ ] `npm run lint` passe
- [ ] `npm run build` réussit
- [ ] `npm run dev` démarre, `/api/health` répond 200
- [ ] Un POST `/api/auth/register` puis un GET `/api/profiles` authentifié fonctionne
- [ ] Commit + push branche

## Phase 10 — Reprise issue #6

Une fois la migration mergée, reprendre la PR #22 avec la nouvelle stack :
- [ ] Endpoints `/api/tutors/:id/learners` (alias rest-style, ou conserver `/api/tutor-students`)
- [ ] Protection : seul un tuteur authentifié peut modifier son réseau
- [ ] Validation Zod sur les bodies
- [ ] 404/400 propres

---

## Section Revue (à remplir au fur et à mesure)

_(vide pour l'instant)_
