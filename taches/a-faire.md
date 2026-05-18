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

## Phase 10 — Reprise issue #6 (CRUD alternants/stagiaires pour tuteur)

**Spec issue #6** :
- `GET /tutors/:id/learners` → liste des alternants/stagiaires rattachés
- `POST /tutors/:id/learners` → ajouter un learner (body `{ userId }`)
- `DELETE /tutors/:id/learners/:learnerId`
- Seul le tuteur authentifié peut modifier son propre réseau
- Validation des IDs, erreurs 404/400 propres

### Plan détaillé

#### Nouvelles routes (3)
- `server/api/tutors/[id]/learners/index.get.ts` → list
- `server/api/tutors/[id]/learners/index.post.ts` → add
- `server/api/tutors/[id]/learners/[learnerId].delete.ts` → remove

#### Règles d'auth (helper centralisé)
- `server/utils/require-self-tutor.ts` : helper qui combine `requireRole(event, 'Tutor')` + vérifie que `getRouterParam(event, 'id') === user.id`. Throw 403 sinon.

#### Validation
- IDs parsés via `z.string().uuid()` (ou check léger côté code)
- Pour POST : body `{ userId: z.string().uuid() }`. Vérifier que le learner existe et a `role in [Alternant, Stagiaire]` (sinon 400 avec message clair)

#### Codes d'erreur
- 401 (pas de session) — via `requireUserSession`
- 403 (pas Tutor OU id URL ≠ user.id) — via helper
- 404 (learner introuvable pour POST/DELETE)
- 400 (body invalide ou learner pas Alternant/Stagiaire)
- 409 (relation déjà existante — P2002)

#### Question architecturale ouverte : que devient `/api/tutor-students/*` ?

Ces 5 routes (héritées de la refacto) exposent le même CRUD mais **sans aucune auth**. Trois choix :

- **A. Supprimer** ces 5 routes. Les nouvelles `/api/tutors/:id/learners` couvrent le besoin. Simplicité maximale.
- **B. Les garder + ajouter `requireRole('Tutor')`** + check ownership. Doublon fonctionnel mais URLs plus génériques pour des appels internes/admin.
- **C. Les garder publiques** (statu quo). ⚠️ Faille de sécurité — n'importe qui peut lister/modifier le réseau de n'importe quel tuteur.

→ Recommandation : **A**. C n'est pas une option (sécurité), B introduit du doublon pour aucun gain immédiat.

#### Tests manuels prévus (à exécuter en local avec Postgres live)
1. Register 1 tuteur + 2 alternants via `/api/auth/register`
2. Login en tant que tuteur → cookie de session
3. POST `/api/tutors/<tutorId>/learners` avec `{ userId: <alternant1> }` → 200
4. GET `/api/tutors/<tutorId>/learners` → liste contenant alternant1
5. DELETE `/api/tutors/<tutorId>/learners/<alternant1>` → 204/200
6. Try POST sans login → 401
7. Try POST en tant qu'alternant → 403
8. Try POST avec `:id` ≠ user.id → 403

### Tâches

- [x] Décision tranchée : **A — supprimer les routes `tutor-students/*`**
- [x] Créer `server/utils/require-self-tutor.ts`
- [x] Créer `server/api/tutors/[id]/learners/index.get.ts`
- [x] Créer `server/api/tutors/[id]/learners/index.post.ts`
- [x] Créer `server/api/tutors/[id]/learners/[learnerId].delete.ts`
- [x] Suppression `server/api/tutor-students/` (5 routes retirées)
- [x] `vue-tsc` : 0 erreur
- [x] `nuxt build` : succès, les 3 routes enregistrées dans le bundle Nitro (`/api/tutors/:id/learners` GET/POST + `/api/tutors/:id/learners/:learnerId` DELETE)
- [x] Commit + push sur `6-featusers-crud-alternantsstagiaires-pour-tuteur` (`b3f426b`)
- [x] PR #22 retitrée et redécrite pour cadrer juste l'issue #6 (le diff réel est désormais d'1 seul commit après fast-forward de `dev` sur `main`)
- [x] `dev` synchronisée sur `main` (fast-forward `c67e925 → df7e804`) — 22 commits de retard rattrapés
- [x] Branche `claude/review-code-progress-fQMkQ` supprimée du remote
- [ ] Smoke test live (à exécuter par l'utilisateur en local avec Postgres)

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

---

## Issue #5 — Auth endpoints multi-rôles

> Branche : `5-feat-auth-multi-roles` → PR vers `dev`

**Objectif** : durcir les endpoints `/api/auth/{register,login,logout,me}` livrés pendant la migration et exposer un mécanisme propre de protection par rôle.

**Divergence assumée vs. spec** : la spec mentionne « JWT + payload contenant role ». Le stack validé est `nuxt-auth-utils` (cookie de session signé, payload côté serveur). La sémantique demandée — auth stateful + role disponible côté requête — est respectée ; on ne réintroduit pas JWT.

### Tâches

- [x] `server/utils/auth-credentials.ts` : schémas `registerInputSchema` / `loginInputSchema` (email lowercase+trim, names trim, password ≥ 8) + `formatZodIssues` pour réponses propres
- [x] `register.post.ts` et `login.post.ts` : adoption du schéma centralisé + `data.issues` en cas de 400
- [x] `server/utils/require-role.ts` : ajout `requireAuth`, signature `requireRole(event, ...allowed: [Role, ...Role[]])` (compile-time : au moins un rôle requis)
- [x] `vitest.config.ts` + suite `tests/server/utils/auth-credentials.test.ts` (13 tests : normalisation, défauts, rejets)
- [x] `vue-tsc --noEmit` : OK
- [x] `npm test` : 13 tests passent

---

## Issue #7 — Protection des routes et redirections

> Branche : `7-feat-route-protection` → PR vers `dev`

**Objectif** : verrouiller l'accès aux routes sensibles côté API (Nitro) et côté pages (Nuxt), avec redirection propre vers `/login` pour les non-authentifiés et vers `/forbidden` pour les rôles non autorisés.

### Architecture

- **Allowlist partagée** : `shared/utils/public-routes.ts` exporte `PUBLIC_API_ROUTES` (health + register/login/logout) et `PUBLIC_PAGES` (`/`, `/login`, `/register`, `/forbidden`). Source unique de vérité pour les deux couches.
- **Backend** : `server/middleware/auth-guard.ts` exige une session sur tout `/api/*` qui n'est pas dans l'allowlist (401 sinon). Les contrôles fins de rôle/ownership restent dans les handlers via `requireRole` / `requireSelfTutor`.
- **Frontend** :
  - `middleware/auth.global.ts` — redirige vers `/login?redirect=...` si non authentifié sur une page non publique. Opt-out via `definePageMeta({ auth: false })`.
  - `middleware/role.ts` — middleware nommé qui lit `definePageMeta({ requireRole })`, redirige vers `/forbidden` si rôle invalide.
- **Pages stubs** : `/login`, `/register`, `/forbidden`. UI minimale fonctionnelle (formulaires natifs). Le rebuild propre revient à #14 / #8.
- **Typage** : `types/page-meta.d.ts` augmente `PageMeta` (`auth?: false`, `requireRole?: Role | Role[]`).

### Tâches

- [x] `shared/utils/public-routes.ts` + tests (17 cas : allowlists API & pages, query-string stripping)
- [x] `server/middleware/auth-guard.ts`
- [x] `middleware/auth.global.ts` + `middleware/role.ts`
- [x] `pages/{login,register,forbidden}.vue` (stubs fonctionnels avec `auth: false`)
- [x] `pages/alternants/{index,[id]}.vue` annotés `requireRole: 'Tutor'`
- [x] `types/page-meta.d.ts`
- [x] `npm test` : 30 tests verts
- [x] `vue-tsc --noEmit` : 0 erreur
- [x] `nuxt build` : succès
