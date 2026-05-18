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
- [x] Migration `init` générée manuellement via `prisma migrate diff --from-empty --to-schema` → `prisma/migrations/20260518000000_init/migration.sql` + `migration_lock.toml`. Sera appliquée par `prisma migrate deploy` au démarrage du conteneur.
- [x] Suppression de `supabase/` faite en Phase 8.

## Phase 3 — Connexion DB (remplacer le plugin Supabase serveur)

- [x] Créer `server/utils/prisma.ts` : singleton `PrismaClient` (pattern HMR-safe)
- [x] Supprimer `server/plugins/supabase.ts`
- [x] Supprimer l'injection `event.context.supabase` (chaque route importe `prisma` directement)
- [x] Supprimer `plugins/supabase.client.ts`
- [x] Supprimer `utils/supabase.ts`
- [x] Supprimer `types/supabase.ts`

## Phase 4 — Réécriture des routes API

Pour chaque route sous `server/api/`, remplacer `supabase.from(...).select/insert/update/delete` par l'équivalent Prisma. Méthodologie : 1 ressource = 1 commit pour faciliter la review.

- [x] `health.get.ts` (n'utilisait pas Supabase)
- [x] `profiles/` (5 routes) → `prisma.user.*`
- [x] `tutor-students/` (5 routes) → `prisma.tutorStudent.*`
- [x] `courses/` (5 routes) → `prisma.course.*`
- [x] `course-assignments/` (5 routes)
- [x] `course-notes/` (5 routes)
- [x] `projects/` (5 routes)
- [x] `project-assignments/` (5 routes)
- [x] `calendar-events/` (5 routes)
- [x] `alternants/` (2 routes) → `prisma.user` filtré par `role: Alternant`

## Phase 5 — Auth minimale (pour que le schéma tienne debout)

> Objectif Phase 5 : avoir un système auth fonctionnel basique. Les écrans UI + flows complets restent dans l'issue #5/#14.

- [x] `server/api/auth/register.post.ts` : email + password + role → bcrypt hash → `prisma.user.create` → `setUserSession`
- [x] `server/api/auth/login.post.ts` : verify password → `setUserSession`
- [x] `server/api/auth/logout.post.ts` : `clearUserSession`
- [x] `server/api/auth/me.get.ts` : `requireUserSession` (le helper de nuxt-auth-utils sert déjà de `requireUser`)
- [x] `server/utils/require-role.ts` : helper d'autorisation par rôle (utilisé pour issue #6)
- [x] `types/auth.d.ts` : augmentation `#auth-utils` pour typer `user` (id, email, firstName, lastName, role)
- [ ] (Optionnel) seed Prisma — reporté, pas bloquant

## Phase 6 — Frontend : retirer Supabase client

- [x] `pages/alternants/index.vue` : `useFetch('/api/alternants')`, UI simplifiée
- [x] `pages/alternants/[id].vue` : `useFetch('/api/alternants/[id]')`, sections obsolètes (compétences/notes/formation) retirées — issue #8 reconstruira le dashboard tuteur proprement
- [x] `components/AlternantsList.vue` : props alignées sur User (firstName/lastName/email/role)
- [x] `pages/index.vue` : retiré "Connexion Supabase" + libellés stack mis à jour
- [x] Aucun `useSupabase*` ni import `~/types/supabase` restant

## Phase 7 — Docker / Dokploy

- [x] `docker-compose.yml` : service `postgres:16-alpine` avec healthcheck + volume nommé
- [x] `docker-compose.yml` : `DATABASE_URL` + `NUXT_SESSION_PASSWORD`, plus aucune référence Supabase
- [x] `Dockerfile` : multi-stage (builder + runner), `prisma generate` dans chaque stage, `prisma migrate deploy` au démarrage
- [x] `docs/deploy-dokploy.md` créé
- [x] `README.md` réécrit (stack actuelle, commandes locales, lien vers le doc Dokploy)

## Phase 8 — Nettoyage

- [x] `MIGRATION_COMPLETE.md` supprimé
- [x] `MONOLITH_SUCCESS.md` supprimé
- [x] Dossier `supabase/` entier supprimé (config.toml + migrations + rapports)
- [x] `docs/BACKEND_API_IMPLEMENTATION.md` supprimé (devenu obsolète, Swagger sera refait via issue #19)
- [x] `scripts/init-supabase.sql` supprimé + dossier `scripts/` retiré
- [x] Dossiers vides `plugins/` et `utils/` racine retirés
- [x] `package.json` : description mise à jour, `jsonwebtoken` + `@types/jsonwebtoken` retirés (inutilisés)

## Phase 9 — Vérification

- [x] `npx vue-tsc --noEmit -p .nuxt/tsconfig.json` : **0 erreur**
- [x] `npm run build` réussit (output Nitro complet, 40 MB)
- [ ] `npm run lint` — non lancé (out of scope migration ; tooling ESLint à valider dans une passe dédiée)
- [ ] `npm run dev` + smoke test `/api/health` + register/login — nécessite Postgres live (sera validé au premier déploiement Dokploy ou en local par l'utilisateur)
- [ ] Commit + push branche (fait au fil des phases)

## Phase 10 — Reprise issue #6

Une fois la migration mergée, reprendre la PR #22 avec la nouvelle stack :
- [ ] Endpoints `/api/tutors/:id/learners` (alias rest-style, ou conserver `/api/tutor-students`)
- [ ] Protection : seul un tuteur authentifié peut modifier son réseau
- [ ] Validation Zod sur les bodies
- [ ] 404/400 propres

---

## Section Revue

### 2026-05-18 — Migration Supabase → Postgres/Prisma/nuxt-auth-utils terminée

**Périmètre livré (Phases 1 à 9 hors lint/smoke-test live)**

- Stack remplacée : `@supabase/supabase-js` retiré, `prisma`, `@prisma/client`, `nuxt-auth-utils`, `bcrypt` installés.
- Schéma Prisma (`prisma/schema.prisma`) : 8 modèles, 2 enums, User et Profile fusionnés.
- 42 routes API réécrites en Prisma, contrat API désormais en camelCase.
- Auth minimale en place : `/api/auth/{register,login,logout,me}` + helper `requireRole`.
- Frontend allégé (pages alternants + composant liste) — issue #8 reconstruira proprement.
- Docker : compose Postgres+app, Dockerfile multi-stage avec `prisma migrate deploy` au démarrage, doc Dokploy.
- Cleanup complet : `supabase/`, `MIGRATION_COMPLETE.md`, `MONOLITH_SUCCESS.md`, scripts obsolètes supprimés.
- Init migration générée (`prisma/migrations/20260518000000_init/migration.sql`) — directement applicable en prod.

**À surveiller (dette identifiée)**

- Frontend `/alternants` est volontairement minimal (juste un listing) ; le dashboard tuteur complet est l'objet de l'issue #8.
- `POST /api/profiles` exige désormais un mot de passe — usage admin uniquement, à protéger via `requireRole(event, 'Tutor')` ou équivalent quand le besoin sera clair (issue #7).
- OpenAPI / Swagger annotations supprimées des routes — issue #19 les refera dans un format cohérent.
- Lint non lancé dans cette passe : config ESLint à vérifier dans une PR dédiée.

**Suite logique**

→ Phase 10 = reprendre l'issue #6 (CRUD alternants/stagiaires pour tuteur) sur la nouvelle stack, en ajoutant les routes alias `/api/tutors/:id/learners` et la validation `requireRole(event, 'Tutor')`.
