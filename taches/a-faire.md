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
- [ ] **F2 — Centre de notifications & relances automatiques** : table `Notification`,
  cloche dans la nav (compteur non-lus), page `/notifications` ; notifications émises par les
  événements existants (annonce publiée, rapport soumis/validé/à revoir, bulletin publié,
  visite planifiée) + relances d'échéances calculées (rapport en retard, visite à venir).
  Gain de temps n°1 cité chez tous les concurrents.
- [ ] **F3 — Vue 360° de l'alternant** : enrichir `/alternants/[id]` en fiche complète —
  KPIs, score de risque, timeline unifiée (notes, retours missions, rapports, visites,
  présences, bulletins, évaluations de compétences), accès rapides. L'écran « préparation
  d'entretien » plébiscité chez Studea.
- [ ] **F4 — Signature tripartite + export PDF** : signatures horodatées (tuteur + alternant)
  sur bulletins et rapports d'étape (table `DocumentSignature`), affichage des signatures,
  vue imprimable (CSS print) du bulletin et du « livret » de l'alternant → export PDF via
  impression navigateur. Exigence OPCO/financeurs, standard Studea/Ypareo.
- [ ] **F5 — Durcissement des routes héritées** : `profiles/*`, `alternants/*`, `courses/*`,
  `course-assignments/*` passent sous `requireRole` + contrôles d'ownership/réseau
  (pré-requis de crédibilité avant toute mise en avant « conformité »).

### P1 — backlog (features suivantes)

- [ ] **Questionnaires / campagnes d'évaluation personnalisables** signés par le trinôme (cœur de Studea).
- [ ] **Émargement par QR code / code de session** (preuve d'assiduité conforme financeurs).
- [ ] **Rôle École / organisation & pilotage par promotion** (espace tripartite complet — gros chantier de schéma).
- [ ] **Casier de documents** (Lot 4 existant — stockage fichiers).
- [ ] **Notifications email** (relances hors connexion) — nécessite un SMTP en prod.
