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

---

## Issue #14 — Formulaires Auth (login / register)

> Branche : `14-feat-auth-ui` → PR vers `dev`

**Objectif** : remplacer les stubs natifs créés dans #7 par des formulaires Nuxt UI propres, avec validation client basée sur la même source que le backend, et redirection post-login en fonction du rôle.

### Choix techniques

- **Source unique de validation** : `server/utils/auth-credentials.ts` déplacé en `shared/utils/auth-credentials.ts`. Le client réutilise les mêmes schémas Zod que le serveur — pas de drift possible. Types switchés vers `z.input` pour matcher l'état de formulaire (pré-defaults).
- **Composant Nuxt UI** : `<UAuthForm>` câblé avec `:schema` + `:fields` + `@submit`. Gestion erreurs serveur via `<UAlert>`.
- **Redirection par rôle** : `shared/utils/auth-redirect.ts` (testé) — `Tutor → /alternants`, autres → `/`. Si `?redirect=…` valide (chemin relatif sûr), il est privilégié.
- **Pas de Pinia** : `useUserSession()` de `nuxt-auth-utils` suffit comme source réactive d'identité. Ajouter Pinia par-dessus dupliquerait l'état pour zéro bénéfice.
- **Header session-aware** : `app.vue` affiche nom + bouton Déconnexion quand loggé, sinon Connexion/Inscription. Lien « Mes alternants » réservé au rôle Tutor.

### Tâches

- [x] Déplacement `server/utils/auth-credentials.ts` → `shared/utils/auth-credentials.ts` (+ tests déplacés)
- [x] `shared/utils/auth-redirect.ts` + tests (9 cas : landing par rôle, redirect sûr, rejet de cibles externes / `javascript:` / `//`)
- [x] `pages/login.vue` réécrit avec `<UAuthForm>` + redirection par rôle
- [x] `pages/register.vue` réécrit avec `<UAuthForm>` (select pour le rôle)
- [x] `pages/forbidden.vue` passé sur Nuxt UI (`<UCard>`, `<UIcon>`, `<UButton>`)
- [x] `app.vue` : header dynamique (login/logout, lien tuteur conditionnel)
- [x] `npm test` : 39 tests verts (3 nouveaux + 30 hérités)
- [x] `vue-tsc --noEmit` : 0 erreur
- [x] `nuxt build` : succès

---

## Issue #8 — Dashboard tuteur (gestion des learners)

> Branche : `8-feat-tutor-dashboard` → PR vers `dev`

**Objectif** : remplacer `/alternants` par un vrai dashboard tuteur connecté aux endpoints `/api/tutors/:id/learners` (issue #6), avec ajout/retrait via modales et UX intuitive.

### Décisions

- **Add-learner par email** : `POST /api/tutors/:id/learners` accepte désormais `{ userId }` OU `{ email }` (union Zod). La résolution email→user est faite côté serveur, l'UI n'a pas à connaître les UUIDs. Le contrat `{ userId }` historique reste valide.
- **Pas de duplication backend** : on étend la route existante au lieu d'ajouter un endpoint de recherche utilisateur — moins d'API, même surface fonctionnelle.
- **Liste branchée sur le tuteur connecté** : `useFetch('/api/tutors/' + user.id + '/learners')` (et pas `/api/alternants` qui listait tous les Alternants de la base).
- **Composants Nuxt UI** : `<UTable>` avec slots `*-cell`, `<UModal>` pour Ajouter et pour confirmer Supprimer, `<UAlert>` pour les erreurs, `useToast()` pour les confirmations.

### Tâches

- [x] `shared/utils/tutor-learners.ts` : `addLearnerBodySchema` (union `{ userId } | { email }`) + tests (5 cas)
- [x] `server/api/tutors/[id]/learners/index.post.ts` : accepte les deux shapes, normalise l'email, conserve les erreurs 400/404/409
- [x] `pages/alternants/index.vue` réécrit en dashboard tuteur (table, ajout via email, suppression confirmée, toasts)
- [x] `pages/alternants/[id].vue` repassé sur Nuxt UI natif (UCard / UAlert / UBadge / UIcon)
- [x] Suppression composants legacy : `components/AlternantsList.vue`, `components/ui/Alert.vue`, `components/ui/Button.vue`
- [x] `npm test` : 44 tests verts (5 nouveaux)
- [x] `vue-tsc --noEmit` : 0 erreur
- [x] `nuxt build` : succès

---

## Issue #12 — Endpoints projets & missions

> Branche : `12-feat-projects-missions` → PR vers `dev`

**Objectif** : durcir les endpoints `/api/projects/*` et `/api/project-assignments/*` (issus de la migration) avec scoping par rôle, ownership et validation forte. Une « mission » = un `ProjectAssignment` (terme métier vs terme de schéma).

### Règles métier

| Action | Tutor | Alternant / Stagiaire |
|---|---|---|
| `GET /projects` | Projets qu'il a créés | Projets où il est assigné |
| `POST /projects` | ✅ `createdById = user.id` (forcé serveur-side) | ❌ 403 |
| `GET /projects/:id` | Si créateur ou learner assigné | Si learner assigné |
| `PUT /projects/:id` | Si créateur | ❌ 403 |
| `DELETE /projects/:id` | Si créateur | ❌ 403 |
| `GET /project-assignments` | Assignations sur ses projets | Ses propres assignations |
| `POST /project-assignments` | ✅ si projet à lui + cible learner | ❌ 403 |
| `GET /project-assignments/:id` | Si créateur du projet | Si c'est sa mission |
| `PUT /project-assignments/:id` | Tous les champs | Uniquement `status` et `studentComment` |
| `DELETE /project-assignments/:id` | Si créateur du projet | ❌ 403 |

### Décisions

- **Pas de `createdById` dans le body** : forcé depuis la session, immuable côté `PUT`. Évite l'usurpation.
- **404 plutôt que 403 pour les ressources invisibles** : ne pas leaker l'existence des projets d'autres tuteurs.
- **`pickStudentEditableFields`** : helper testé qui filtre le payload en PUT pour ne garder que `status` et `studentComment` quand l'appelant est l'alternant. Si rien ne reste après filtrage → 403.
- **`requireRole(event, Role.Tutor)`** sur POST projects/assignments + DELETE assignment ; `requireAuth` ailleurs (le scoping fait le reste).
- **Schémas Zod centralisés** dans `shared/utils/projects.ts` (testables, réutilisables par le futur frontend issue #13).

### Tâches

- [x] `shared/utils/projects.ts` : `projectCreateSchema`, `projectUpdateSchema`, `assignmentCreateSchema`, `assignmentUpdateSchema` + `pickStudentEditableFields`
- [x] `server/utils/projects.ts` : `loadProjectVisibleTo`, `loadProjectOwnedBy`, `loadAssignmentVisibleTo`
- [x] 5 routes `server/api/projects/*` réécrites (scope + ownership + erreurs structurées)
- [x] 5 routes `server/api/project-assignments/*` réécrites
- [x] `tests/shared/projects.test.ts` : 16 cas sur les schémas + le helper de filtrage
- [x] `npm test` : 60 tests verts
- [x] `vue-tsc --noEmit` : 0 erreur
- [x] `nuxt build` : succès

---

## Issue #13 — UI projets & missions

> Branche : `13-feat-projects-ui` → PR vers `dev`

**Objectif** : exposer le backend #12 dans l'UI. Tuteur gère ses projets et leurs missions ; alternant suit ses missions et met à jour son avancement (`status`, `studentComment`).

### Décisions

- **Sélection learner par dropdown plutôt qu'UUID** : la modale « Assigner un learner » ne demande pas un UUID brut — elle propose un `<USelect>` chargé depuis `/api/tutors/{user.id}/learners` (la liste du réseau du tuteur). Évite la friction UX.
- **State stocké en `string` puis converti** : les `<UTextarea>` Nuxt UI n'acceptent que `string`. Les champs `description` / `*Comment` sont conservés en `''` côté formulaire, convertis en `null` au submit (le backend distingue `null` de `""`).
- **Vue alternant en cards plutôt qu'en table** : un alternant a typiquement peu de missions actives. Une card par mission avec sélecteur de statut + zone de notes inline est plus lisible qu'un tableau.
- **Helpers d'affichage centralisés** (`projectStatusLabel`, `projectStatusColor`, `PROJECT_STATUS_OPTIONS`) côté `shared/utils/projects.ts` : une seule source de labels FR + couleurs UBadge, partageable côté tuteur et alternant.
- **`landingPageFor` ajusté** : Alternants / Stagiaires redirigés vers `/missions` après login (au lieu de `/`).

### Tâches

- [x] `shared/utils/projects.ts` enrichi : `projectStatusLabel`, `projectStatusColor`, `PROJECT_STATUS_OPTIONS` + tests
- [x] `landingPageFor` redirige Alternant/Stagiaire vers `/missions` (+ tests mis à jour)
- [x] `pages/projects/index.vue` : liste tuteur (`<UTable>`), modales création/édition/suppression
- [x] `pages/projects/[id].vue` : détail projet + missions (assigner via select learner, éditer statut+commentaire tuteur, retirer)
- [x] `pages/missions/index.vue` : cards par mission, formulaire inline statut + studentComment
- [x] `app.vue` : nav enrichie (« Mes projets » tuteur, « Mes missions » learner)
- [x] `npm test` : 63 tests verts (3 nouveaux)
- [x] `vue-tsc --noEmit` : 0 erreur
- [x] `nuxt build` : succès

---

## Issue #9 — Endpoints cours, notes & calendrier

> Branche : `9-feat-courses-notes` → PR vers `dev`

**Objectif** : aligner le backend sur la spec — `GET /users/:id/calendar` + `POST /events/:eventId/notes` — et durcir les routes existantes `calendar-events/*` et `course-notes/*` (scope par rôle, ownership).

### Choix de schéma (option A validée)

Ajout d'une clef étrangère **nullable** `course_assignment_id` sur `calendar_events` qui pointe vers `course_assignments(id)`. Un événement peut maintenant être :
- une session de cours (lié à un `CourseAssignment`)
- ou un événement libre (lien à `null`)

`POST /events/:eventId/notes` crée/upsert une `CourseNote` (clef = `assignment.id` + `sessionDate = event.startTime` tronquée à minuit UTC). Le 400 explicite si l'event n'est pas rattaché à une session.

### Matrice rôle / route

| Action | Tutor | Alternant / Stagiaire |
|---|---|---|
| `GET /api/calendar-events` | Ses events (tutorId) | Ses events (studentId) |
| `POST /api/calendar-events` | ✅ avec learner de son réseau (+ assignment compatible si fourni) | ❌ 403 |
| `GET /api/calendar-events/:id` | Si tutorId ou studentId == user.id | Idem |
| `PUT /api/calendar-events/:id` | Si tutorId == user.id | ❌ 403 |
| `DELETE /api/calendar-events/:id` | Si tutorId == user.id | ❌ 403 |
| `GET /api/users/:id/calendar` | Pour soi ou pour un learner de son réseau | Pour soi |
| `POST /api/events/:eventId/notes` | Sur events de son réseau, si event lié à une session | Sur ses propres events, idem |
| `GET /api/course-notes` | Notes des learners de son réseau | Ses notes |
| `POST /api/course-notes` | Sur learner de son réseau | Sur soi |
| `GET / PUT / DELETE /api/course-notes/:id` | Si learner dans son réseau | Si c'est sa note |

### Décisions

- **404 plutôt que 403** sur ressources invisibles (cohérent avec #12).
- **`createdById` interdit dans le body** (POST /calendar-events) : forcé serveur-side depuis la session tuteur.
- **`notionsCovered` traité via `Prisma.DbNull`** quand l'appelant envoie `null` (sinon TypeScript refuse l'assignation sur un champ `Json?`).
- **Pas de transaction** pour l'upsert via event : `findFirst` puis `update`/`create` — l'index sur `(assignmentId, sessionDate)` n'existe pas, ajouter un `@@unique` serait plus propre mais déborde du scope (à revoir si on a besoin de race-safety).
- **Schémas Zod centralisés** dans `shared/utils/calendar.ts` (réutilisables par #11).

### Tâches

- [x] Schéma Prisma : ajout `courseAssignmentId` (nullable) + relation + index
- [x] Migration `20260518120000_link_calendar_to_assignment` (1 ADD COLUMN, 1 INDEX, 1 FK SET NULL)
- [x] `shared/utils/calendar.ts` : `calendarEventCreateSchema`, `calendarEventUpdateSchema`, `eventNoteUpsertSchema` + tests (19 cas)
- [x] `server/utils/courses.ts` : helpers `assertTutorOwnsLearner`, `loadCalendarEventVisibleTo`, `loadCourseNoteVisibleTo`, `assertCanReadAssignment`, `notionsToPrismaInput`
- [x] 5 routes `/api/calendar-events/*` durcies
- [x] 5 routes `/api/course-notes/*` durcies
- [x] Nouvelles routes `/api/users/:id/calendar` (GET) et `/api/events/:id/notes` (POST upsert)
- [x] `npm test` : 82 tests verts (19 nouveaux)
- [x] `vue-tsc --noEmit` : 0 erreur
- [x] `nuxt build` : succès

---

## Issue #11 — Dashboard Alternant (cours + notes)

> Branche : `11-feat-learner-dashboard` → PR vers `dev`

**Objectif** : exposer côté UI le backend cours/notes livré par #9 — `GET /api/users/:id/calendar` + `POST /api/events/:eventId/notes` — sous forme d'un dashboard d'inscription des notes par session.

### Décisions

- **Une carte par session** (et non un tableau) : un alternant a peu de sessions actives, l'édition inline est plus lisible en cards. Le mot « tableau » de la spec est respecté au sens « inventaire de ses cours ».
- **`/courses` plutôt que `/learner/dashboard`** : URL plus parlante et conforme à la convention courte du reste de l'app.
- **Notions saisies en CSV** : un input texte séparé par virgules, parsé/dédupliqué côté client via `parseNotions`. Plus simple qu'un composant de chips et déjà serializable côté JSON pour le backend.
- **État de note pré-rempli depuis `/api/course-notes`** : le composant matche le note existant via `findNoteForSession` (`assignmentId` + `sessionDate` tronquée à minuit UTC). Évite de demander un second fetch par event.
- **Refresh complet après submit** : `refreshEvents()` + `refreshNotes()` en parallèle. Le badge « Note enregistrée » réagit en temps réel sans reload de page (critère d'acceptance).

### Tâches

- [x] `shared/utils/course-notes.ts` : `sessionDateKey`, `findNoteForSession`, `parseNotions`, `notionsToString` + tests (10 cas)
- [x] `pages/courses/index.vue` : liste des sessions, formulaire inline par session (note 0–20 / commentaire / notions CSV), badge d'état
- [x] `app.vue` : lien « Mes cours » pour les learners
- [x] `npm test` : 92 tests verts (10 nouveaux)
- [x] `vue-tsc --noEmit` : 0 erreur
- [x] `nuxt build` : succès

---

## Issue #10 — Calendrier (vue mois / semaine / jour / liste)

> Branche : `10-feat-calendar-ui` → PR vers `dev`

**Objectif** : afficher les `calendar_events` du user connecté dans une vraie vue calendrier (FullCalendar), avec navigation mois/semaine/jour/liste, et permettre d'éditer la note d'une session de cours d'un clic.

### Décisions

- **FullCalendar v6.1** : standard de l'industrie, accessible, supporté en Vue 3 via `@fullcalendar/vue3`. Plugins activés : `dayGrid`, `timeGrid`, `interaction`, `list`. Locale FR officielle.
- **`<ClientOnly>` obligatoire** : FullCalendar accède au DOM dans son init ; on évite le SSR.
- **Page unique `/calendar` pour tous les rôles** : tutor et learner voient leur propre agenda via `GET /api/users/{user.id}/calendar` (helper backend qui scope correctement).
- **Modale unique pour clic** : si l'event est rattaché à une session (`courseAssignmentId`), elle affiche le formulaire de note (réutilise les helpers de #11 — `findNoteForSession`, `parseNotions`, `notionsToString`) ; sinon elle affiche le détail et le tuteur peut supprimer.
- **Création d'event réservée au tuteur** : modale avec sélection du learner depuis son réseau (`/api/tutors/{user.id}/learners`), titre, début/fin (datetime-local convertis en ISO).
- **Style accordé Tailwind** : header toolbar FullCalendar restylé en `emerald-700/800` via overrides CSS minimaux.

### Tâches

- [x] `npm i @fullcalendar/{vue3,core,daygrid,timegrid,interaction,list}` (v6.1.20)
- [x] `shared/utils/calendar-display.ts` : `toFullCalendarEvent` + tests (6 cas)
- [x] `pages/calendar.vue` : vue FullCalendar + modale note + modale création (tuteur)
- [x] `app.vue` : lien « Calendrier » accessible à tous les rôles authentifiés
- [x] `npm test` : 98 tests verts (6 nouveaux)
- [x] `vue-tsc --noEmit` : 0 erreur
- [x] `nuxt build` : succès

---

## Issue #18 — CI/CD + Dokploy ready

> Branche : `18-feat-ci-cd` → PR vers `dev`

**Objectif** : poser un workflow GitHub Actions qui valide chaque PR (typecheck + tests + build), durcir le Dockerfile pour la prod et compléter `.env.example` pour qu'un déploiement Dokploy soit possible sans deviner les clefs.

### Tâches

- [x] `.github/workflows/ci.yml` : `npm ci` → `prisma generate` → `nuxt prepare` → `vue-tsc --noEmit` → `npm test` → `nuxt build` (Node 20, concurrency control, cancel sur push PR)
- [x] `Dockerfile` : user non-root (uid 10001) avec `chown -R`, `HEALTHCHECK` sur `GET /api/health`, multi-stage conservé
- [x] `docker-compose.yml` : healthcheck applicatif aligné sur celui du Dockerfile, depends_on healthy déjà en place
- [x] `.env.example` : ajout `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `APP_PORT`, sections commentées par usage (app / compose / optionnel)
- [x] `docs/deploy-dokploy.md` : section CI ajoutée, mention non-root + healthcheck
- [x] `README.md` : badge CI

**Hors scope (à suivre dans une PR dédiée)** : la commande `npm run lint` casse car ESLint v10 attend une `eslint.config.*` flat config, absente du repo. Lint donc retiré du CI pour ne pas bloquer ; ticket à ouvrir pour migrer la config.

---

## 2026-07-21 — Refonte UI (pages internes) + police Mona Sans + fix SSR

> Branche : `claude/features-app-status-nkwh0u`

**Objectif** : passer les pages applicatives (hors landing `/`) d'un style « pill jaune partout » à un style **minimaliste type ShadcnUI**, changer la police pour **Mona Sans**, et corriger un bug SSR sur `/projects/[id]`.

### Fondations (design system)
- **Police** : `@fontsource-variable/mona-sans` self-hostée (`nuxt.config.css` importe `wght.css`), `--font-sans` mis à jour. `ui: { fonts: false }` pour désactiver `@nuxt/fonts` (crashait sur le woff2 variable + fetch réseau bloqué).
- **Icônes** : `@iconify-json/lucide` en local (fin des 403 `api.iconify.design`).
- **Boutons** (`app.config.ts`) : base `rounded-full font-semibold` → `rounded-md font-medium`. La landing force `rounded-full` en inline → pills **préservés** sur `/`.
- **Rayon** : `--ui-radius` 0.5rem → 0.375rem (feel plus net).
- **Footer** (`app.vue`) : footer marketing complet **uniquement** sur `/`, `/features`, `/pricing` ; footer minimal ailleurs (fin du gros footer noir répété = « slop »).
- **Composant** `components/PageHeader.vue` : en-tête cohérent (titre + sous-titre + slot actions + séparateur) réutilisé sur toutes les pages.

### Parti pris visuel
- Action principale = bouton **neutre foncé** (signature Shadcn) au lieu du jaune. Le jaune reste un accent (logo, `today` du calendrier).
- Tables/listes dans des conteneurs bordés fins ; cartes `border` + `bg-elevated` ; badges `variant="subtle"` neutres ; badge de statut de mission passé de `solid`/`lg` (gros jaune) à `subtle`.
- FullCalendar : boutons `rounded-md`, actif foncé, events en chips foncés.

### Pages refondues
`login`, `register`, `forbidden`, `alternants/index`, `alternants/[id]`, `projects/index`, `projects/[id]`, `missions/index`, `courses/index`, `calendar`. Landing `/` **inchangée** (hors police).

### Fix SSR (`/projects/[id]` + `/calendar`)
- Cause : `$fetch('/api/tutors/:id/learners')` dans un `watch` immediate → tourne au SSR sans cookie → 401 plein écran au hard-load.
- Correctif : `useRequestFetch()` (forwarde les cookies au SSR). Cf. `taches/lecons.md`.

### Vérifications
- [x] `npm test` : 98 tests verts
- [x] `npx vue-tsc --noEmit` : 0 erreur
- [x] `npm run build` : succès
- [x] Screenshots des 11 vues (Postgres local + seed de démo) : rendu cohérent, Mona Sans partout, hard-load `/projects/[id]` = 200 (fix SSR confirmé)
- [x] Landing `/` vérifiée : CTA jaunes en pill + footer marketing préservés

### Aussi
- [x] Issue #18 (CI/CD) clôturée en `completed`.

### Note hors-scope
- Le calendrier peut apparaître vide en vue Semaine selon les données/fuseaux — comportement **pré-existant** (déjà présent avant la refonte), non lié à ces changements.

---

## 2026-07-21 — Dashboards, journal de retours & enrichissement fonctionnel

> Branche : `claude/features-app-status-nkwh0u` — construit via un workflow d'agents (front) + backend fait à la main.

### 1. Journal de retours (avancement des missions)
Remplacement du champ unique `studentComment` (écrasé à chaque fois) par un **journal append-only**.
- **Modèle** `ProjectUpdate` (assignmentId, authorId, body, status?, createdAt) + migration `20260721000000_project_updates`.
- **API** : `GET/POST /api/project-assignments/[id]/updates` (auth via `loadAssignmentVisibleTo`). Le POST ajoute une entrée et, si un statut est fourni, met aussi à jour le statut courant de la mission (transaction).
- `updates` inclus dans `GET /api/project-assignments` et `loadProjectVisibleTo`.
- **UI** : `pages/missions` = formulaire « Publier le retour » (statut + texte) + timeline `JOURNAL`. `pages/projects/[id]` = journal en lecture pour le tuteur. Composant réutilisable `components/UpdateTimeline.vue`.

### 2. Dashboards (notes, évolution, stats)
- **API** `GET /api/dashboard/summary` role-aware : KPIs, note moyenne, courbe d'évolution mensuelle (8 mois), missions par statut, derniers retours (tuteur), dernières notes (learner), prochaines sessions.
- **Page** `pages/dashboard.vue` role-aware, devient la landing post-login (nav + `resolvePostLoginPath` → `/dashboard`).
- **Composants graphiques SVG faits main (offline, aucune lib)** : `StatCard`, `TrendChart` (courbe lissée Catmull-Rom + aire, gère les trous, `useId()` anti-mismatch), `BarChart`, `UpdateTimeline`. Style monochrome ShadcnUI, clair/sombre via tokens.

### 3. Workflow d'agents
Les 4 composants + la page dashboard ont été générés en parallèle par un workflow d'agents Opus contre des contrats figés (formes d'API + contrats de props), puis intégrés/corrigés/vérifiés à la main.

### Vérifications
- [x] Migration appliquée ; seed enrichi (notes mensuelles Jan→Juil, 6 retours) pour des graphes crédibles
- [x] `npm test` : 98 tests verts (test `auth-redirect` mis à jour → `/dashboard`)
- [x] `npx vue-tsc --noEmit` : 0 erreur ; `npm run build` : succès
- [x] Screenshots : dashboards tuteur + alternant (KPIs, courbe, barres, timeline), journal missions, journal projet
- [x] Test end-to-end : POST d'un retour → ajout au journal + statut mission synchronisé

---

## 2026-07-21 — Lot 1 « PRONOTE pour l'alternance » (Présences · Rapports d'étape · Annonces)

> Branche `claude/features-app-status-nkwh0u`. Planifié via un agent Fable 5, implémenté via un workflow d'agents Opus (pipeline API→UI par module), socle + intégration à la main.

### Modules livrés
- **A. Présences** — pointage d'assiduité sur les sessions du calendrier (présent/absent/retard/excusé), taux + stats. Table `Attendance` (1 par `CalendarEvent`). Pages : `/presences` (tuteur = pointage inline via `AttendanceControl` ; learner = KPIs + historique via `AttendanceBadge`). Routes : `POST/DELETE /api/events/:id/attendance`, `GET /api/attendance`, `GET /api/users/:id/attendance`.
- **B. Rapports d'étape** — livret d'apprentissage : l'alternant soumet un CR périodique, le tuteur valide / demande révision (machine à états `brouillon→soumis→valide|a_revoir`, appliquée serveur). Table `ProgressReport`. Pages : `/rapports` (liste role-aware + file « à valider ») et `/rapports/:id` (lecture + édition + revue). Routes CRUD + `submit` + `review`.
- **C. Annonces** — canal tuteur→étudiants avec accusé de lecture. Tables `Announcement` + `AnnouncementRecipient`. Page `/annonces` (composition tuteur multi-destinataires ; lecture learner avec marquage lu). Routes CRUD + `read`.

### Socle & intégration (à la main)
- Migration `20260721120000_lot1_pronote` (2 enums, 4 tables, FK, index). Helpers de visibilité `server/utils/{network,attendance,reports,announcements}.ts` (pattern 404 comme `projects.ts`). Schémas Zod partagés `shared/utils/{attendance,progress-reports,announcements}.ts`.
- Dashboard : 2 nouveaux KPIs (tuteur « Rapports à valider », learner « Taux de présence »). Nav : liens Présences/Rapports/Annonces (desktop + mobile). Seed de démo enrichi (sessions passées pointées, rapports multi-statuts, annonces lues/non-lues).

### Vérifications
- [x] `npm test` : 98 verts · `vue-tsc` : 0 erreur · `npm run build` : OK
- [x] Rendu réel des 3 modules (tuteur + learner) vérifié par screenshots — après correction d'un crash d'hydratation (enum Prisma évalué au runtime dans du code partagé, cf. `taches/lecons.md`).

### Lots suivants (non faits)
- Lot 2 : Bulletins périodiques + Visites tuteur · Lot 3 : Référentiel de compétences + Messagerie · Lot 4 : Casier de documents (stockage fichiers).

---

## 2026-07-22 — Lot 2 « PRONOTE » (Bulletins périodiques · Visites tuteur)

> Branche `claude/features-app-status-nkwh0u`. Même méthode : socle à la main → workflow d'agents Opus (pipeline API→UI) → intégration + vérif.

### Modules livrés
- **Bulletins périodiques** — le tuteur crée des périodes, puis **publie** le bulletin de chaque alternant : le contenu (moyennes par cours + moyenne générale + assiduité) est **calculé puis figé** (`snapshot` JSON) à la publication. L'alternant consulte ses bulletins publiés. Tables `ReportPeriod` + `ReportCard`. Pages `/bulletins` (role-aware) et `/bulletins/[id]` (détail période, publication par learner). Composant `ReportCardView` (moyenne générale + `BarChart` des moyennes par cours + assiduité + appréciation).
- **Visites tuteur** — planification (entreprise/école/visio) + compte-rendu structuré (résumé, prochaines étapes, statut planifiée/réalisée/annulée). Table `TutorVisit`. Page `/visites` (tuteur = planif + compte-rendu ; learner = lecture). Composant `VisitStatusBadge`.

### Socle & intégration (à la main)
- Migration `20260721140000_lot2_bulletins_visites` (1 enum `VisitStatus`, 3 tables). Helper `computeSnapshot` (moyennes + assiduité sur la fenêtre de période) + helpers de visibilité (`report-cards.ts`, `tutor-visits.ts`). Schémas Zod partagés (string-literal).
- Nav : les 5 modules de suivi regroupés sous un menu déroulant **« Suivi »** (desktop) — évite une barre surchargée ; liens à plat en mobile.

### Vérifications
- [x] `npm test` : 98 verts · `vue-tsc` : 0 erreur (après cast `snapshot` → `Prisma.InputJsonValue`) · `npm run build` : OK
- [x] Rendu réel des 4 vues (tuteur + learner) vérifié par screenshots (bulletin figé + graphe, visites + comptes-rendus).

### Reste (lots suivants)
- Lot 3 : Référentiel de compétences + Messagerie · Lot 4 : Casier de documents (stockage fichiers).

---

## 2026-07-22 — Lot 3 « PRONOTE » (Référentiel de compétences · Messagerie)

> Branche `claude/features-app-status-nkwh0u`. Socle à la main → workflow d'agents Opus (pipeline API→UI) → intégration + vérif.

### Modules livrés
- **Compétences** — le tuteur définit un **référentiel** (domaines → compétences) et **évalue** chaque alternant par compétence (niveau : découverte / en cours / acquis / maîtrise). L'alternant visualise sa **carte de compétences** : progression globale + par domaine (barres) + niveau par compétence. Tables `CompetencyDomain`, `Competency`, `CompetencyAssessment` (append-only, le plus récent fait foi). Helper `studentCompetencyMap`. Page `/competences` (role-aware), composant `CompetencyLevelBadge`.
- **Messagerie** — un fil unique par couple tuteur/étudiant, avec accusé de lecture. Tables `Conversation` + `Message`. Pages `/messages` (liste + non-lus) et `/messages/[id]` (fil de discussion type chat + composer). Pas de temps réel (rafraîchissement au chargement, cohérent avec le réseau restreint).

### Socle & intégration (à la main)
- Migration `20260722000000_lot3_competences_messagerie` (1 enum `CompetencyLevel`, 5 tables). Helpers de visibilité + agrégation (`competencies.ts`, `messages.ts`). Schémas Zod partagés (string-literal).
- Nav : « Suivi » regroupe désormais les 7 modules (Présences, Rapports, Bulletins, Compétences, Visites, Annonces, Messages).

### Vérifications
- [x] `npm test` : 98 verts · `vue-tsc` : 0 erreur · `npm run build` : OK
- [x] Rendu réel des 4 vues vérifié (carte de compétences + barres, fil de messages).

### Reste (lot suivant)
- Lot 4 : Casier de documents (convention, attestations) — nécessite du stockage de fichiers (à isoler).

---

## 2026-07-28 — Roadmap « game breakers » (issue de l'étude de marché)

> Étude de marché complète : `taches/etude-marche.md`. Concurrents analysés : Studea, Ypareo,
> Edusign/Sowesign, Bloom Alternance, Loop Formations, SIRH (SIGMA-RH, Kammi…).
> Branche `claude/market-research-game-breaker-features-20u03q`.

### P0 — à implémenter maintenant (workflow d'agents Opus)

- [x] **F1 — Alertes de décrochage (early warning)** : score de risque par alternant calculé
  côté serveur (assiduité 30 j, retards, rapports en retard/à revoir, tendance des notes,
  inactivité), niveaux `ok / vigilance / alerte`, badge + section dédiée sur le dashboard
  tuteur et dans la liste des alternants. Différenciant fort (Edusign, Loop Formations).
- [x] **F2 — Centre de notifications & relances automatiques** : table `Notification`,
  cloche dans la nav (compteur non-lus), page `/notifications` ; notifications émises par les
  événements existants (annonce publiée, rapport soumis/validé/à revoir, bulletin publié,
  visite planifiée) + relances d'échéances calculées (rapport en retard, visite à venir).
  Gain de temps n°1 cité chez tous les concurrents.
- [x] **F3 — Vue 360° de l'alternant** : enrichir `/alternants/[id]` en fiche complète —
  KPIs, score de risque, timeline unifiée (notes, retours missions, rapports, visites,
  présences, bulletins, évaluations de compétences), accès rapides. L'écran « préparation
  d'entretien » plébiscité chez Studea.
- [x] **F4 — Signature tripartite + export PDF** : signatures horodatées (tuteur + alternant)
  sur bulletins et rapports d'étape (table `DocumentSignature`), affichage des signatures,
  vue imprimable (CSS print) du bulletin et du « livret » de l'alternant → export PDF via
  impression navigateur. Exigence OPCO/financeurs, standard Studea/Ypareo.
  - Fiche de bulletin dédiée `/bulletins/carte/[id]` (accessible aux deux parties) :
    `/bulletins/[id]` est la page de PÉRIODE, réservée au tuteur et listant N alternants —
    elle ne pouvait porter ni la signature de l'étudiant ni un PDF « un bulletin ».
  - Livret imprimable `/alternants/[id]/livret` alimenté par un endpoint d'agrégation dédié
    (`/api/users/[id]/livret`) : aucune route de liste n'exposait au tuteur les bulletins et
    rapports d'UN étudiant, et les signatures sont jointes en lot (2 requêtes).
  - `pages/alternants/[id].vue` déplacée en `pages/alternants/[id]/index.vue` pour que le
    livret soit une route sœur et non une route enfant (Nuxt exigerait sinon un `<NuxtPage />`).
- [x] **F5 — Durcissement des routes héritées** : `profiles/*`, `alternants/*`, `courses/*`,
  `course-assignments/*` passent sous `requireRole` + contrôles d'ownership/réseau
  (pré-requis de crédibilité avant toute mise en avant « conformité »).
  - Les 17 routes ne passaient que par l'`auth-guard` global : `POST /api/profiles` créait un
    compte avec un rôle arbitraire (donc `Tutor`), `GET /api/profiles` et `GET /api/alternants`
    listaient toute la base, `courses/*` et `course-assignments/*` étaient un CRUD ouvert avec
    `createdById` accepté depuis le body.
  - Recensement préalable des consommateurs : **aucune page/composant/composable n'appelle ces
    routes**. La liste des alternants passe par `GET /api/tutors/[id]/learners` et l'ajout par
    e-mail par `POST /api/tutors/[id]/learners` (inchangés) ; `pages/courses` et `pages/calendar`
    ne consomment que `/api/course-notes` et `/api/users/[id]/calendar`. Aucun usage à préserver,
    donc aucune régression fonctionnelle possible ; les routes sont conservées (domaine vivant :
    `CourseAssignment` porte les sessions du calendrier, les notes de cours et les bulletins).
  - Règles appliquées : `profiles` GET/POST/DELETE → `Tutor` (liste bornée au réseau + soi-même,
    création limitée à `Alternant|Stagiaire` avec rattachement automatique au réseau du créateur
    dans une transaction, suppression réservée à un learner du réseau) ; `profiles` GET/PUT par id
    → soi-même ou tuteur du profil, sans changement de rôle possible ; `alternants/*` → `Tutor`
    filtré sur son réseau ; `courses`/`course-assignments` → écriture `Tutor` + ownership du cours
    (`createdById` forcé depuis la session), lecture tuteur = ses cours / learner = ses affectations.
  - Schémas Zod déplacés dans `shared/utils/profiles.ts` et `shared/utils/courses.ts` (littéraux de
    chaîne, aucun enum Prisma côté partagé), helpers de visibilité dans `server/utils/profiles.ts`
    et `server/utils/courses.ts` — 404 systématique, jamais 403, pour ne pas divulguer l'existence.

### Vérifications (relecture transverse F1→F5)

- `npx prisma generate` ✅ — Prisma Client v7.8.0.
- `npx vue-tsc --noEmit` ✅ — aucune erreur.
- `npm test` ✅ — 15 fichiers, 207 tests (dont 7 nouveaux modules purs : `risk`,
  `notifications`, `overview`, `livret`, `signatures`, `profiles`, `courses`).
- `npm run build` ✅ — build Nitro complet.
- `npm run lint` ✅ — après correction d'une erreur `vue/no-deprecated-filter`
  **préexistante** dans `pages/competences/index.vue` : l'union TS
  `CompetencyLevel | undefined` écrite dans le template était lue par ESLint comme
  un filtre Vue 2. Cast extrait dans une fonction `cellLevel()` du `<script setup>`.

Contrôles de conformité passés en revue sur le diff complet `origin/main...HEAD` :

- **Leçon 6** (enums Prisma) : les 7 nouveaux modules `shared/**` n'importent que `zod`
  au runtime ; `SignatureDocumentType` et `CompetencyLevel` y sont en `import type`.
  Aucun nouveau composant n'importe de valeur d'enum. *(Reste connu et préexistant,
  hors périmètre : 11 pages importent `Role`/`ProjectStatus` en valeur — build OK.)*
- **Leçon 4** (`$fetch` SSR) : les 5 nouvelles pages chargent via `useFetch` ; les
  `$fetch` nus sont tous dans des gestionnaires d'événements (clic), jamais au setup.
- **Leçon 3** : aucun `z.uuid()`, `z.guid()` partout.
- **Routes API** : les 35 routes touchées passent toutes par `requireAuth`/`requireRole`,
  puis par un helper de visibilité renvoyant 404. Seul `signDocument()` renvoie 403/409,
  volontairement : la visibilité y est déjà tranchée en amont, l'existence n'est pas divulguée.
- **Migrations** : `prisma migrate diff --from-empty --to-schema` (Prisma 7 a renommé
  `--to-schema-datamodel`) confirme que `notifications`, `document_signatures` et l'enum
  `SignatureDocumentType` sont générés à l'identique des deux fichiers de migration écrits
  à la main (colonnes, index, FK `ON DELETE CASCADE`).
- **Nav** : `NotificationBell` est monté dans la barre d'actions (visible aussi en mobile),
  ce qui alimente `useNotificationCountState()` et donc le badge du menu mobile — une seule
  requête. Le lien `/notifications` du menu mobile est bien dans la branche « connecté »,
  tous rôles confondus. `print:hidden` sur nav/footers pour l'export PDF.
- **UI** : aucun texte anglais résiduel dans le diff `pages/` + `components/`.
- **Route déplacée** : `pages/alternants/[id].vue` → `[id]/index.vue`, aucune référence
  périmée (le `server/api/alternants/[id].get.ts` restant est une route API, sans rapport).

### P1 — backlog (features suivantes)

- [ ] **Questionnaires / campagnes d'évaluation personnalisables** signés par le trinôme (cœur de Studea).
- [ ] **Émargement par QR code / code de session** (preuve d'assiduité conforme financeurs).
- [ ] **Rôle École / organisation & pilotage par promotion** (espace tripartite complet — gros chantier de schéma).
- [ ] **Casier de documents** (Lot 4 existant — stockage fichiers).
- [ ] **Notifications email** (relances hors connexion) — nécessite un SMTP en prod.

---

## Correctifs 2026-08-03 — production inutilisable (logo, auth, rôle) + compte de test Dokploy

### Constat

Symptômes rapportés : logo remplacé par du texte dans la nav, inscription et connexion
impossibles, rôle non sélectionnable. Reproduits sur le build de production (`npm run build`
puis `node .output/server/index.mjs`), invisibles en `npm run dev`.

Cause unique pour l'essentiel : `Failed to resolve module specifier ".prisma/client/index-browser"`
levé au chargement du bundle client → **aucune hydratation** → l'app reste du HTML statique.
Détail dans `taches/lecons.md` (2026-08-03).

### Réalisé

- [x] `shared/utils/enums.ts` : les 7 enums Prisma redéclarés en objets `as const`.
- [x] `app.vue`, 13 pages, 5 composants, `middleware/role.ts`, 10 utils partagés et 2 fichiers
      de types basculés sur ce module ; plus aucune référence à `@prisma/client` hors `server/`.
- [x] Règle ESLint `no-restricted-imports` sur `app.vue`, `pages/`, `components/`, `composables/`,
      `middleware/`, `plugins/`, `shared/` pour empêcher la régression.
- [x] `auth-guard` : les endpoints internes des modules Nuxt (`/api/_`) ne sont plus bloqués
      (icônes 401 sur toutes les pages publiques, `/api/_auth/session`). Tests ajoutés.
- [x] Nav : logo servi en SSR via deux `<img>` permutées en CSS (`dark:hidden` / `hidden dark:block`)
      au lieu d'un `<ClientOnly>` dont le fallback texte restait affiché sans hydratation.
      Le lien du logo pointe vers `/dashboard` quand l'utilisateur est connecté.
- [x] Nav : liens morts corrigés — « Produit » pointait sur la route inexistante `/product_anchor`
      (→ ancre `/#product_anchor`), « Tarifs » sur `/pricing` qui n'existe pas (lien retiré,
      à remettre quand la page existera).
- [x] `nuxt.config` : `session.cookie.secure` déclaré dans `runtimeConfig` pour rester surchargeable
      par `NUXT_SESSION_COOKIE_SECURE=false` si le déploiement est exposé en HTTP simple.
- [x] Compte de test provisionné au démarrage depuis `TEMP_LOGIN` / `TEMP_PASS`
      (+ `TEMP_ROLE`, `Tutor` par défaut) : `server/plugins/temp-account.ts`, upsert à chaque
      démarrage, échec base non bloquant. Variables passées au conteneur dans `docker-compose.yml`.
- [x] Suppression des tirets cadratins « — » des textes affichés (pages, libellés d'API,
      placeholders de valeurs vides).

### Vérifications

- `npm run lint` ✅ · `npm test` ✅ (15 fichiers, 210 tests) · `npm run build` ✅
- `grep -rl "\.prisma/client/index-browser" .output/public/_nuxt/` → vide (avant : 20 chunks).
- Parcours Playwright sur le build de production, zéro `pageerror` :
  inscription avec choix du rôle « Tuteur » (`/api/auth/me` renvoie bien `role: "Tutor"`,
  nav tuteur affichée) → déconnexion → connexion avec mauvais mot de passe (alerte
  « Identifiants invalides. ») → connexion valide → `/dashboard` conservé après rechargement.
- Balayage des 14 routes principales connecté en tuteur : toutes rendues, aucune 5xx.
- `TEMP_LOGIN` / `TEMP_PASS` : compte créé au démarrage, `POST /api/auth/login` → 200,
  connexion via l'UI OK.
- Logo vérifié en thème clair et sombre (permutation CSS).

### Reste à traiter (hors périmètre de ce lot)

- [ ] `Hydration completed but contains mismatches` sur `/alternants` et `/projects` : les
      `Intl.DateTimeFormat('fr-FR')` de ces tableaux n'ont pas de `timeZone`, donc le rendu
      serveur (UTC) et le rendu navigateur peuvent différer. Correctif propre : imposer
      `timeZone: 'Europe/Paris'` aux ~28 formateurs de l'app.
- [ ] Page `/pricing` à créer, puis remettre le lien « Tarifs » dans la nav.

## 2026-08-09 — Refonte visuelle de la homepage (`pages/index.vue`)

Objectif : moderniser la landing sans toucher ni à la palette (jaune `#F1DE02`,
fonds `#F9F9F9` / `#1F1F1E`, tokens `--ui-*`) ni aux textes (copie conservée à
l'identique). Direction : éditorial/typographique plutôt que SaaS centré générique.

- [x] Hero asymétrique (texte à gauche, visuel à droite en lg) : H1 en très grande
      taille, « mieux » surligné façon marqueur jaune, « un Excel » barré à la main
      (SVG), fond grille pointillée + halo jaune, carte étudiante en collage sur
      aplat jaune décalé avec pastilles flottantes (« À jour », « ↑ +12 % »).
- [x] Bandeau défilant (marquee CSS) avec les mots-clés du produit, entre hero et
      section problème.
- [x] En-têtes de section éditoriaux : eyebrow avec barre jaune + H2 à gauche,
      paragraphe calé à droite (grille 12 colonnes), au lieu des badges pill centrés.
- [x] « Sans / Avec alternup » en panneaux contrastés : Sans sur fond muted en
      bordure pointillée avec ✗ rouges, Avec sur panneau sombre `#1F1F1E` avec ✓
      jaunes et halo.
- [x] Bénéfices en bento asymétrique 7/5–5/7 avec index numérotés (01–04) sur
      carreau jaune ; maquettes internes conservées (recherche, notification avec
      pile suggérée, graphe, compétences) et hover lift.
- [x] CTA final en panneau sombre arrondi avec « contrôle » surligné jaune.
- [x] Apparition au scroll (IntersectionObserver + `[data-reveal]`),
      `prefers-reduced-motion` respecté partout (reveal, marquee, float, hover).
- [x] Mode sombre : panneaux sombres basculés sur les tokens (`--ui-bg-muted` +
      bordure) pour rester lisibles.

### Vérifications

- `npm run lint` ✅ · `npm test` ✅ (15 fichiers, 210 tests).
- Rendu vérifié par screenshots Playwright sur le dev server : desktop 1440px
  clair + sombre, mobile 390px. Aucune erreur console liée à la page
  (le « Hydration completed but contains mismatches » en sombre vient du
  color-mode `system`, préexistant).
- Ancre `/#product_anchor` (lien « Produit » de la nav) conservée sur le H2 de la
  section problème.

## 2026-08-09 — Calendrier : FullCalendar → Schedule-X (thème shadcn)

Objectif : remplacer le moteur d'affichage de `pages/calendar.vue` par
**Schedule-X v4** avec le thème `shadcn`, pour un rendu type « ReUI Event
Calendar » (nav sobre Aujourd'hui / ‹ › / titre / sélecteur de vue, chips
d'événements colorées). Toute la logique métier existante est conservée :
chargement via `GET /api/users/{id}/calendar`, modale de note de session,
modale de détail/suppression, modale de création (tuteur).

### Décisions

- **Vues** : `viewMonthGrid`, `viewWeek`, `viewDay`, `viewList` — vue par défaut
  `week`, comme l'ancien `timeGridWeek`. `locale: 'fr-FR'` (Schedule-X embarque
  les traductions françaises), `firstDayOfWeek: 1` (lundi).
- **Dates `Temporal`** : la v4 n'accepte plus de chaînes mais des
  `Temporal.ZonedDateTime` lus sur le **global**. Le polyfill
  (`temporal-polyfill`, peerDependency de `@schedule-x/calendar`) est chargé
  dynamiquement dans `onMounted`, et **seulement s'il manque**, pour que la
  librairie et la page partagent la même implémentation (Schedule-X valide ses
  dates avec `instanceof`). Types globaux exposés par `types/temporal.d.ts`.
- **SSR** : `createCalendar` lit `document` → création dans `onMounted`,
  `<ClientOnly>` + spinner conservés.
- **Catégories colorées** (`calendars` Schedule-X) : `session` (vert),
  `visite` (jaune de marque, détecté sur le titre — pas de type en base),
  `autre` (neutre). Couleurs clair/sombre déclarées séparément.
- **Thème sombre** : `calendarApp.setTheme('dark' | 'light')` piloté par
  `useColorMode()`. La palette du thème shadcn est remappée sur les tokens
  `--ui-*` de l'app dans le `<style>` de la page.
- **Pas de recréation du calendrier** : `events-service` (`set`) pour les
  données, `calendar-controls` (`setDate`) pour recentrer après une création.
- **Édition réservée au tuteur** : les plugins `drag-and-drop` et `resize` ne
  sont enregistrés que pour lui ; `onBeforeEventUpdateAsync` fait le
  `PUT /api/calendar-events/[id]` et renvoie `false` en cas d'échec, ce qui fait
  revenir l'événement à sa position d'origine.

### Point d'attention (dette upstream)

`@schedule-x/drag-and-drop` et `@schedule-x/resize` s'arrêtent à la **3.7.3**
(pas de v4 publiée). `resize` reste compatible, mais `drag-and-drop` expose
encore `create*DragHandler` alors que le calendrier v4 appelle `start*Drag` :
sans correctif, tout glisser-déposer lève un `TypeError`. La page installe donc
des **alias** (`createCompatibleDragAndDropPlugin`), inertes dès qu'une v4 du
plugin sortira. À retirer à ce moment-là.

### Tâches

- [x] `pages/calendar.vue` : Schedule-X + thème shadcn, 4 vues, DnD/resize,
      ligne d'heure courante, clic sur créneau vide → création pré-remplie
- [x] `shared/utils/calendar-display.ts` : `toFullCalendarEvent` →
      `toDisplayEvent` / `toCalendarCategory` (pur, dates laissées en ISO)
- [x] `tests/shared/calendar-display.test.ts` réécrit (8 cas)
- [x] `package.json` : suppression des 6 `@fullcalendar/*`, ajout de
      `temporal-polyfill` (**lock à régénérer**)
- [x] `assets/css/main.css` : plus aucune mention FullCalendar
- [x] `npm run lint` ✅ · `npx vue-tsc --noEmit` ✅ · `npm test` ✅ (212 tests)
- [x] Vérif d'intégration en Node (DOM stubbé) : `createCalendar` accepte la
      config exacte de la page, `events-service.set`, `calendar-controls.setDate`,
      `setTheme('dark')` et les alias DnD répondent

---

# Plan — Calendrier (événement sans alternant, présence obligatoire), taille calendrier, refonte login/register, dropdown compte (2026-08-10)

> Branche : `claude/calendar-auth-ui-updates-srnz6g`

## 1. Événement sans alternant + présence obligatoire
- [x] Prisma : `CalendarEvent.studentId` nullable + champ `presenceRequired Boolean @default(false)`
- [x] Migration SQL `optional_student_presence_required`
- [x] Zod (`shared/utils/calendar.ts`) : `studentId` optionnel, `presenceRequired`, garde-fous (courseAssignment/présence exigent un alternant)
- [x] API POST : `assertTutorOwnsLearner` seulement si alternant fourni
- [x] API attendance : ignorer/refuser les événements sans alternant
- [x] UI modale création : sélection alternant optionnelle + switch « Présence obligatoire »
- [x] Modale détail : afficher l'alternant et le badge présence
- [x] Tests `tests/shared/calendar.test.ts` mis à jour

## 2. Taille du calendrier
- [x] Hauteur adaptée au viewport (plus de débordement de page)

## 3. Refonte login/register
- [x] Fond jaune strié (SVG généré, `public/images/auth-bg.svg`)
- [x] Split : formulaire à gauche, texte sombre « Manage your student like never » à droite
- [x] Composant partagé `AuthShell.vue` utilisé par les deux pages

## 4. Dropdown compte (nav)
- [x] Remplacer nom + bouton déconnexion par un `UDropdownMenu` (Mon compte / Déconnexion en rouge)
- [x] Page `/account` minimale (infos du compte)

## Ajouts en cours de route (même session)
- [x] Bouton Megaphone (nav) ouvrant la dialog « Nouveautés » (`components/ChangelogDialog.vue`, données dans `shared/utils/changelog.ts`)
- [x] Vues applicatives centrées (`max-w-7xl mx-auto` dans `app.vue`), pages publiques/auth pleine largeur
- [x] Nav : hover carré jaune #F1DE02, page active en fond inversé (noir/blanc)
- [x] Home : pastilles du hero repositionnées vers le centre (positions des flèches du schéma)
- [x] Home : badges « À jour » et « ↑ +12 % » de la carte draggables (même mécanique GSAP)

## Revue
- Vérifié en local (Postgres 16 + `prisma migrate deploy` + comptes de test) :
  - POST /api/calendar-events sans `studentId` → 201 ; avec `presenceRequired` sans alternant → 400.
  - UI : sélection « Aucun » par défaut, case « Présence obligatoire » visible seulement avec un alternant,
    badge rouge dans la modale de détail, calendrier ajusté au viewport.
  - Login/register : fond `public/images/auth-bg.svg`, formulaire à gauche, accroche à droite.
  - Dropdown compte (Mon compte / Déconnexion en rouge), page `/account`.
  - Dialog changelog, marges latérales, hover/actif nav, drag pastilles + badges : validés par captures Playwright.
- `npm run lint` ✅ · `npm test` (216) ✅ · `npm run build` ✅

---

# Plan — Vue Alternants en cards + onboarding par invitation email (2026-08-10)

> Branche : `claude/calendar-auth-ui-updates-srnz6g`

- [x] Vue cards par défaut (grille responsive : avatar initiales, nom, email, rôle, risque, date, retrait)
- [x] Switcher 2 tabs avec icônes (cards ↔ tableau), cards par défaut
- [x] Bouton « Attribution » : reprend l'ancien « Ajouter » (rattacher un compte existant)
- [x] Bouton « Ajouter » : onboarding par invitation email
  - [x] Modèle Prisma `Invitation` + migration (token unique, expiration 7 j, unicité tuteur+email)
  - [x] `POST /api/invitations` (tuteur) : upsert + envoi email (nodemailer, SMTP `NUXT_SMTP_*`), fallback lien à copier
  - [x] `GET /api/invitations/[token]` public (préfixe ajouté à `public-routes.ts`)
  - [x] `/register?invite=<token>` : email/rôle imposés, prénom/nom pré-remplis, bannière tuteur
  - [x] `POST /api/auth/register` : transaction création compte + rattachement réseau + invitation consommée
- [x] Tests : `tests/shared/invitations.test.ts` (5 tests) — 221 tests OK, lint OK, build OK

## Revue

Vérifié en conditions réelles (Postgres local + build de prod) : invitation créée par
un tuteur, consultation publique du lien, inscription via token (rôle/email bien imposés
côté serveur même si le client envoie autre chose), rattachement automatique au réseau,
token à usage unique (400 à la seconde utilisation), 409 si un compte existe déjà pour
l'email invité. Captures d'écran des vues cards/tableau, de la modale d'invitation et de
/register avec bannière d'invitation.

## Ajustement — Invitation par lien seul + suivi d'acceptation (2026-08-11)

- [x] Retrait de l'envoi d'email : `server/utils/mail.ts` supprimé, `nodemailer` désinstallé,
      `runtimeConfig.smtp` et clefs `NUXT_SMTP_*` retirées
- [x] `POST /api/invitations` renvoie le lien généré (valable 7 jours), à transmettre par le tuteur
- [x] `GET /api/invitations` : liste des invitations du tuteur (suivi)
- [x] `DELETE /api/invitations/[id]` : révoquer un lien / retirer une ligne du suivi
- [x] Helper partagé `invitationStatus()` : `pending` / `accepted` / `expired`
- [x] Section « Invitations » sur /alternants : statut, date d'acceptation, copie du lien, révocation
- [x] Notification `invitation_acceptee` au tuteur à l'acceptation (icône `user-check`)
- [x] Tests : 224 tests OK (statuts d'invitation couverts), lint OK, build OK
