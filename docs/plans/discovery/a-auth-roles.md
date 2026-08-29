# Phase 0-A — Audit authentification & rôles

> Audit lecture seule en vue du split de l'application en deux espaces
> (Tuteur vs Alternant/Stagiaire). Date : 2026-08-29.

## Synthèse

1. **Les rôles existent déjà** : enum Prisma `Role { Tutor, Alternant, Stagiaire }` + champ `User.role` (défaut `Alternant`), indexé (`@@index([role])`).
2. **La relation tuteur↔apprenant est un seul modèle** : `TutorStudent` (table de jointure `User↔User`, PK composite `[tutorId, studentId]`). Il n'y a **pas** de modèles `Alternant`/`Stagiaire`/`Tuteur` distincts : un seul modèle `User` pour tout le monde.
3. **La session contient le rôle** : `setUserSession` stocke `{ id, email, firstName, lastName, role }` (typé dans `types/auth.d.ts`).
4. **Trois couches de protection** : guard serveur global (`server/middleware/auth-guard.ts`, 401 sur tout `/api/*` non public), helpers par handler (`requireAuth`/`requireRole`/`requireSelfTutor`), et middlewares routeur client (`auth.global.ts` + `role.ts` opt-in via `definePageMeta.requireRole`).
5. **L'app est déjà bi-rôle de fait** : les apprenants ont des comptes `User`, se connectent, et ont des pages dédiées (`/courses`, `/missions` sont `requireRole: [Alternant, Stagiaire]`). L'inscription est **libre** (le rôle Tuteur est choisissable sur `/register`) ou **sur invitation** (token, rôle et email imposés).
6. **Redirection post-login** : `shared/utils/auth-redirect.ts` — la mécanique par rôle existe (`DEFAULT_LANDING: Record<Role, string>`) mais les trois rôles pointent aujourd'hui tous sur `/dashboard`. C'est le point d'accroche naturel du split.
7. **Autorisation par ressource** : `server/utils/network.ts` (`isTutorOf`, `learnerIdsOf`, `assertCanViewStudent` → 404) utilisé dans ~14 fichiers serveur ; côté serveur le contrôle est systématique (103/108 fichiers d'API utilisent un helper d'auth, les 5 restants sont les routes publiques).
8. **Pas de dossier `layouts/`** : toute la coquille (nav fixe, liens conditionnés par `isTutor`/`isLearner`) vit dans `app.vue`.
9. Les pages « mixtes » (dashboard, calendar, presences, rapports, annonces, messages, bulletins, competences, visites, notifications, account) branchent leur comportement sur `user.role` **dans le composant**, sans contrainte de route.
10. Le split `/tuteur` vs espace apprenant consistera surtout à : déplacer les pages, généraliser `requireRole` au niveau des préfixes d'URL, différencier `DEFAULT_LANDING`, et éclater les pages mixtes.

---

## 1. Modélisation des rôles (prisma/schema.prisma)

### Enum et champ rôle

`prisma/schema.prisma:12-16` :

```prisma
enum Role {
  Tutor
  Alternant
  Stagiaire
}
```

`model User` (`prisma/schema.prisma:25-87`) — champs clés :

- `id String @id @default(uuid())`, `email @unique`, `passwordHash`, `firstName`, `lastName`
- `role Role @default(Alternant)` + `@@index([role])`
- **Aucun modèle séparé** `Tuteur` / `Alternant` / `Stagiaire` : le rôle est un simple attribut de `User`. Toutes les relations « tuteur » et « étudiant » sont des relations nommées vers `User` (ex. `tutoredStudents TutorStudent[] @relation("Tutor")` / `tutors TutorStudent[] @relation("Student")`).

L'enum est **dupliqué volontairement** côté client dans `shared/utils/enums.ts` (`export const Role = { Tutor, Alternant, Stagiaire } as const`) car `@prisma/client` est interdit dans le code navigateur (règle ESLint, cf. AGENTS.md). Toute évolution de l'enum doit être répercutée aux deux endroits.

### Relation tuteur ↔ apprenant

`model TutorStudent` (`prisma/schema.prisma:89-99`) :

```prisma
model TutorStudent {
  tutorId   String @map("tutor_id")
  studentId String @map("student_id")
  tutor   User @relation("Tutor", fields: [tutorId], ...)
  student User @relation("Student", fields: [studentId], ...)
  @@id([tutorId, studentId])
}
```

C'est du **N-N** (un apprenant peut en théorie avoir plusieurs tuteurs ; en pratique `progress-reports/index.post.ts` fait `findFirst({ where: { studentId } })` — hypothèse implicite « un tuteur par apprenant »).

### Modèle Invitation

`model Invitation` (`prisma/schema.prisma:104-121`) : `tutorId`, `email`, `firstName?`, `lastName?`, `role Role @default(Stagiaire)`, `token @unique`, `expiresAt`, `acceptedAt?`, avec `@@unique([tutorId, email])` (ré-inviter remplace).

### Autres modèles porteurs de la dualité tuteur/étudiant

Presque tous les modèles portent des FK explicites `tutorId`/`studentId` vers `User` : `CalendarEvent` (student optionnel, tutor requis), `ProgressReport` (student+tutor), `ReportPeriod` (tutor), `ReportCard` (student), `TutorVisit` (student+tutor), `CompetencyDomain` (tutor), `CompetencyAssessment` (student+assessedBy), `Conversation` (`@@unique([tutorId, studentId])`), `PresenceEntry` (student+recordedBy), `Attendance` (recordedBy), `Announcement`/`AnnouncementRecipient` (author/student), `CourseAssignment`/`ProjectAssignment` (studentId), `Notification` (userId), `DocumentSignature` (userId, polymorphe).

## 2. Cycle de session nuxt-auth-utils

### Login — `server/api/auth/login.post.ts`

Valide via `loginInputSchema` (Zod, `shared/utils/auth-credentials.ts`), `bcrypt.compare`, puis :

```ts
const publicUser = { id, email, firstName, lastName, role: user.role }
await setUserSession(event, { user: publicUser })
```

**Le rôle est donc dans le cookie de session** (signé, nuxt-auth-utils). Typage augmenté dans `types/auth.d.ts` (`declare module '#auth-utils' { interface User { id; email; firstName; lastName; role: Role } }`).

Conséquence à noter : un changement de rôle en base ne se propage pas à une session déjà émise (pas de relecture DB à chaque requête).

### Register — `server/api/auth/register.post.ts`

Deux chemins :
- **Libre** : `role` vient du body (`registerInputSchema`, défaut `Alternant`) — le client peut choisir `Tutor` (cf. §5).
- **Sur invitation** (`inviteToken`) : email + rôle **imposés** par l'invitation ; transaction qui crée le `User`, la ligne `TutorStudent` (rattachement au tuteur invitant) et marque `acceptedAt` ; notification best-effort au tuteur. Puis `setUserSession` immédiat (auto-login).

### Autres routes auth

- `server/api/auth/me.get.ts` : `requireUserSession` → renvoie `user` de session.
- `server/api/auth/logout.post.ts` : `clearUserSession`.

### Vérification côté API

Trois niveaux :

1. **Guard global Nitro** — `server/middleware/auth-guard.ts` : tout `/api/*` non listé dans `shared/utils/public-routes.ts` exige une session (`getUserSession` → 401). Routes publiques : `/api/health`, `/api/auth/{login,register,logout}`, préfixes `/api/_` (session nuxt-auth-utils, icônes) et `/api/invitations/token/` (consulté anonymement depuis `/register`).
2. **Helpers par handler** — `server/utils/require-role.ts` :
   ```ts
   requireAuth(event)                 // requireUserSession → user
   requireRole(event, ...allowed)     // 403 si user.role ∉ allowed
   ```
   et `server/utils/require-self-tutor.ts` (`requireSelfTutor` : rôle `Tutor` **et** `params.id === user.id`, utilisé pour `/api/tutors/[id]/...`).
3. **Autorisation par ressource** — voir §6.

Recensement : 103 des 108 fichiers de `server/api/` appellent un de ces helpers ; les 5 restants sont les routes publiques (login, register, logout, health, invitations/token). ~60 handlers utilisent `requireRole(event, Role.Tutor)` ; les routes « apprenant » utilisent `requireRole(event, Role.Alternant, Role.Stagiaire)` (ex. `progress-reports/index.post.ts`) ou `requireAuth` + branchement sur `user.role` (ex. `presence-entries/index.post.ts`).

## 3. Middleware côté client

`middleware/` contient deux fichiers :

- **`middleware/auth.global.ts`** (global) : si `to.meta.auth === false` ou `isPublicPage(to.path)` (pages `/`, `/login`, `/register`, `/forbidden` — `shared/utils/public-routes.ts`), laisse passer ; sinon exige `useUserSession().loggedIn`, redirection `/login?redirect=<fullPath>`.
- **`middleware/role.ts`** (opt-in, nommé) : lit `to.meta.requireRole` (`Role | Role[]`, typé via `types/page-meta.d.ts`), redirige vers `/forbidden` si le rôle de session n'est pas dans la liste.

Usage dans les pages via `definePageMeta` :

| Meta | Pages |
|---|---|
| `auth: false` (publiques) | `index.vue`, `features.vue`, `login.vue`, `register.vue`, `forbidden.vue` |
| `middleware: ['role'], requireRole: 'Tutor'` | `alternants/index.vue`, `alternants/[id]/index.vue`, `alternants/[id]/livret.vue`, `projects/index.vue`, `projects/[id].vue`, `bulletins/[id].vue` |
| `middleware: ['role'], requireRole: [Alternant, Stagiaire]` | `courses/index.vue`, `missions/index.vue` |
| `definePageMeta({})` ou absent (authentifié, tous rôles) | `dashboard`, `calendar`, `presences`, `rapports/*`, `annonces`, `messages/*`, `bulletins/index`, `bulletins/carte/[id]`, `competences`, `visites`, `notifications`, `account` |

## 4. Redirection post-login

- `pages/login.vue` (`onSubmit`) : `$fetch('/api/auth/login')` → `refreshSession()` → `navigateTo(resolvePostLoginPath(user.value.role, route.query.redirect))`.
- `shared/utils/auth-redirect.ts` :
  ```ts
  const DEFAULT_LANDING: Record<Role, string> = {
    Tutor: '/dashboard', Alternant: '/dashboard', Stagiaire: '/dashboard'
  }
  ```
  `resolvePostLoginPath` respecte `?redirect=` (protégé contre `//…`), sinon landing par rôle.
- `pages/register.vue` utilise le même `resolvePostLoginPath` après création de compte.

**La différenciation par rôle est déjà câblée mais neutralisée** (trois valeurs identiques). Pour le split, il suffira de changer ce mapping (`Tutor: '/tuteur/dashboard'`, apprenants vers leur espace) — c'est le seul endroit à toucher pour le post-login.

## 5. Mono-rôle de fait ? Non — bi-rôle assumé

- Les alternants/stagiaires **ont des comptes `User`** et se connectent normalement (même formulaire `/login`, aucune restriction par rôle au login).
- **Inscription libre** : `pages/register.vue` propose un `USelectMenu` avec les 3 rôles, `Tuteur` inclus (`roleItems`, lignes 173-177). N'importe qui peut donc se créer un compte Tuteur — point à réévaluer au moment du split.
- **Inscription sur invitation** : flux complet en place —
  - création : `server/api/invitations/index.post.ts` (`requireRole(Tutor)`, token `randomBytes(32)`, TTL `INVITATION_TTL_DAYS`, upsert par `(tutorId, email)`, refus 409 si l'email a déjà un compte → passer par « Attribution ») ; pas d'envoi d'email, le tuteur transmet le lien `/register?invite=<token>` lui-même ;
  - consultation anonyme : `server/api/invitations/token/[token].get.ts` (route publique par préfixe) ;
  - liste/révocation : `server/api/invitations/index.get.ts`, `[id].delete.ts` ;
  - acceptation : dans `register.post.ts` (rôle + email imposés, rattachement `TutorStudent` transactionnel).
- **Rattachement direct** (comptes existants) : `server/api/tutors/[id]/learners/index.post.ts` + `available.get.ts` (protégés par `requireSelfTutor`).
- Les pages apprenantes existent déjà (`/courses`, `/missions`), et les pages mixtes branchent l'UI sur le rôle (ex. `pages/dashboard.vue` : `isTutor = computed(() => summary.value?.role === 'Tutor')` ; `pages/presences.vue` : « comportement selon le rôle »). La nav de `app.vue` affiche des liens différents selon `isTutor` / `isLearner`.

## 6. Autorisation par ressource côté serveur

Cœur : `server/utils/network.ts` —

```ts
isTutorOf(tutorId, studentId)        // existence du lien TutorStudent
learnerIdsOf(tutorId)                // ids des apprenants du tuteur
assertCanViewStudent(studentId, user) // OK si soi-même, ou Tutor lié ; sinon 404
```

Le refus est un **404** (pas 403) pour ne pas révéler l'existence de la ressource.

Patterns constatés :
- **Listes tuteur filtrées** par `learnerIdsOf` / jointure `TutorStudent` (ex. `alternants/index.get.ts`, `attendance/index.get.ts`, `conversations/index.get.ts`).
- **Accès fiche/objet** via `assertCanViewStudent` (ex. `users/[id]/overview.get.ts`, `users/[id]/competencies.get.ts`, `course-assignments/index.get.ts`, `presence-entries/index.get.ts`, `report-periods/[id]/publish.post.ts`, `tutor-visits/index.post.ts`, `announcements/index.post.ts`, `competency-assessments/index.post.ts`).
- **Helpers de visibilité par module** dans `server/utils/` (`profiles.ts`, `messages.ts`, `presence-entries.ts` — ex. `assertCanRecordFor` pour le pointage, avec règle anti-triche : un apprenant ne modifie plus son pointage, seul son tuteur le peut), et `signatures.ts` qui recharge le document via ces helpers avant toute écriture (relation polymorphe sans FK).
- **Apprenant → son tuteur** : `progress-reports/index.post.ts` prend le tuteur via `tutorStudent.findFirst({ where: { studentId: user.id } })` (400 « Aucun tuteur rattaché »).
- **Routes self-tutor** : `/api/tutors/[id]/...` verrouillées par `requireSelfTutor` (rôle + identité).

## 7. Pages et layouts existants

**Pas de dossier `layouts/`** — la coquille (nav fixe style Linear, logo, liens conditionnels `isTutor`/`isLearner`, `LearnerDock`/`LearnerFocusSwitcher`, `NotificationBell`) est directement dans `app.vue`. Le split devra probablement introduire `layouts/` (ou deux sous-arbres de pages avec composants de shell distincts).

Arborescence `pages/` (26 fichiers) :

| Page | Accès | Description |
|---|---|---|
| `index.vue` | public | Landing marketing |
| `features.vue` | public | Page fonctionnalités (marketing) |
| `login.vue` | public | Connexion (UForm + redirect par rôle) |
| `register.vue` | public | Inscription libre (choix du rôle) ou sur invitation (`?invite=`) |
| `forbidden.vue` | public | Page 403 (cible du middleware `role`) |
| `dashboard.vue` | tous rôles | Tableau de bord, contenu branché sur le rôle |
| `account.vue` | tous rôles | Profil du compte |
| `calendar.vue` | tous rôles | Calendrier Schedule-X (tuteur crée/édite, apprenant consulte) |
| `presences.vue` | tous rôles | Pointage journalier (apprenant pointe, tuteur corrige/consulte) |
| `notifications.vue` | tous rôles | Centre de notifications |
| `annonces.vue` | tous rôles | Annonces (tuteur publie, apprenant lit/accuse lecture) |
| `messages/index.vue`, `messages/[id].vue` | tous rôles | Messagerie tuteur↔apprenant (fil unique par couple) |
| `rapports/index.vue`, `rapports/[id].vue` | tous rôles | Rapports d'étape (apprenant rédige/soumet, tuteur relit/valide) |
| `bulletins/index.vue` | tous rôles | Liste bulletins/périodes |
| `bulletins/[id].vue` | **Tutor** | Gestion d'une période de bulletins |
| `bulletins/carte/[id].vue` | tous rôles | Vue d'un bulletin individuel (+ signatures) |
| `competences/index.vue` | tous rôles | Référentiel + évaluations de compétences |
| `visites/index.vue` | tous rôles | Visites tuteur |
| `alternants/index.vue` | **Tutor** | Réseau d'apprenants (invitations, attribution) |
| `alternants/[id]/index.vue` | **Tutor** | Fiche d'un apprenant |
| `alternants/[id]/livret.vue` | **Tutor** | Livret d'apprentissage consolidé |
| `projects/index.vue`, `projects/[id].vue` | **Tutor** | Projets/missions côté tuteur |
| `courses/index.vue` | **Alternant/Stagiaire** | Cours de l'apprenant |
| `missions/index.vue` | **Alternant/Stagiaire** | Missions de l'apprenant |

## Risques & points d'attention pour le split

1. **Rôle figé dans le cookie de session** : promouvoir/rétrograder un utilisateur ne change pas sa session active. Si le split rend le rôle plus structurant (préfixe d'URL), prévoir une invalidation/refresh de session, ou accepter le décalage.
2. **Inscription libre en Tuteur** (`pages/register.vue`, `registerInputSchema.role`) : quiconque peut créer un compte tuteur. À trancher avant/pendant le split (fermer, ou garder pour le self-service).
3. **`?redirect=` post-login non filtré par rôle** : `resolvePostLoginPath` respecte n'importe quel chemin interne ; un apprenant redirigé vers une URL `/tuteur/...` tombera sur `/forbidden` seulement si le middleware `role` couvre la route cible. Avec le split, préférer un contrôle par préfixe (middleware global) plutôt que du `requireRole` page par page — aujourd'hui la protection de rôle client est **opt-in** et 11 pages mixtes n'en ont aucune.
4. **Pages mixtes à éclater** : `dashboard`, `presences`, `calendar`, `rapports`, `annonces`, `messages`, `bulletins/index`, `bulletins/carte/[id]`, `competences`, `visites` servent les deux rôles avec des branches `user.role` internes. Le split devra soit les dupliquer (`/tuteur/...` + espace apprenant), soit les partager via composants communs — attention aux liens en dur (`link: '/alternants'` dans les notifications de `register.post.ts`, liens `notifyUser` dans d'autres modules, nav d'`app.vue`, redirections `navigateTo` internes).
5. **Pas de `layouts/`** : la nav vit dans `app.vue` avec des `v-if` par rôle. Le split est l'occasion d'introduire deux layouts (tuteur / apprenant) — mais c'est un refactor de `app.vue` complet, pas un simple déplacement.
6. **Hypothèse « un tuteur par apprenant »** codée en dur par endroits (`findFirst` dans `progress-reports/index.post.ts`) alors que `TutorStudent` est N-N : à documenter/verrouiller avant de bâtir l'espace apprenant dessus.
7. **URLs = contrat** : renommer `pages/*` en `/tuteur/*` casse les liens stockés en base (`Notification.link`) et les `?redirect=`. Prévoir des redirects 301/aliases ou une migration des liens.
8. **La sécurité réelle est côté serveur et est déjà saine** (guard global + `requireRole` + `assertCanViewStudent` en 404) : le split des espaces est avant tout un chantier **front/UX**, il ne doit pas donner l'illusion d'ajouter de la sécurité ni la dégrader en déplaçant les pages sans leurs `definePageMeta`.
9. **Duplication d'enum** `prisma/schema.prisma` ↔ `shared/utils/enums.ts` : si le split introduit un nouveau rôle ou renomme, deux endroits à synchroniser (plus `DEFAULT_LANDING`, `roleItems`, `types/*.d.ts`).

## Fichiers clés

- `prisma/schema.prisma` — enum `Role`, `User`, `TutorStudent`, `Invitation`
- `shared/utils/enums.ts` — miroir client de l'enum `Role`
- `shared/utils/auth-credentials.ts` — schémas Zod login/register
- `shared/utils/auth-redirect.ts` — `DEFAULT_LANDING` / `resolvePostLoginPath` (point d'accroche du split)
- `shared/utils/public-routes.ts` — pages et routes API publiques
- `server/api/auth/login.post.ts`, `register.post.ts`, `logout.post.ts`, `me.get.ts`
- `server/middleware/auth-guard.ts` — 401 global sur `/api/*`
- `server/utils/require-role.ts`, `server/utils/require-self-tutor.ts`
- `server/utils/network.ts` — `isTutorOf`, `learnerIdsOf`, `assertCanViewStudent`
- `server/api/invitations/index.post.ts`, `index.get.ts`, `[id].delete.ts`, `token/[token].get.ts`
- `server/api/tutors/[id]/learners/index.post.ts`, `available.get.ts` — attribution directe
- `middleware/auth.global.ts`, `middleware/role.ts`
- `types/auth.d.ts` (session typée avec `role`), `types/page-meta.d.ts` (`requireRole`)
- `app.vue` — shell/nav unique, branché sur `isTutor`/`isLearner`
- `pages/login.vue`, `pages/register.vue`, `pages/forbidden.vue`
