# Phase 0-B — Conventions du dépôt Alternup

> Audit lecture seule (2026-08-29). Objectif : que le futur module « veille d'offres »
> et le split d'espaces suivent exactement les patterns existants.

## Synthèse

- **API** : ~110 fichiers sous `server/api/`, un fichier par verbe HTTP au format
  `<ressource>/index.get.ts`, `[id].put.ts` ou `[id]/action.post.ts`. Squelette unique :
  `requireAuth`/`requireRole` → validation Zod `safeParse` (schémas partagés dans
  `shared/utils/`) → `createError` 400 en français avec `data.issues` → Prisma via le
  singleton `~/server/utils/prisma` → retour direct de l'objet Prisma (pas d'enveloppe).
- **Autorisation** : garde globale 401 (`server/middleware/auth-guard.ts`), helpers
  `requireRole` (403) et loaders `loadXVisibleTo` / `loadXOwnedBy` (404 volontaire pour ne
  pas fuiter l'existence d'une ressource hors périmètre) dans `server/utils/<ressource>.ts`.
- **Pagination** : quasi inexistante — un seul cas (`/api/notifications`) en `skip` +
  `take` fixe (`NOTIFICATION_PAGE_SIZE = 50`). Pas de pattern page/limit ni cursor établi.
- **Front** : pas de dossier `layouts/` ni de store Pinia (aucun `defineStore`) — la coquille
  vit dans `app.vue` (nav fixe + footer), l'état partagé passe par `useState` dans
  `composables/`. Les pages chargent en SSR via `useFetch` et mutent via `$fetch` dans des
  handlers d'événements, avec `refresh()` + `useToast()` ensuite.
- **Tests** : Vitest, uniquement `tests/shared/*.test.ts` sur les fonctions pures et
  schémas Zod de `shared/utils/` ; les routes API se vérifient à la main (curl/navigateur).

---

## 1. Structure de `server/api/`

Arborescence (fichiers `.ts`, verbe HTTP en suffixe de nom de fichier) :

```
server/api/
├── account/            password.put.ts · profile.put.ts
├── alternants/         index.get.ts · [id].get.ts
├── announcements/      index.get.ts · index.post.ts · [id]/index.get.ts · [id]/index.delete.ts · [id]/read.post.ts
├── attendance/         index.get.ts
├── auth/               login.post.ts · logout.post.ts · me.get.ts · register.post.ts
├── calendar-events/    index.get.ts · index.post.ts · [id].get.ts · [id].put.ts · [id].delete.ts
├── competencies/       index.post.ts · [id]/index.delete.ts
├── competency-assessments/  index.post.ts
├── competency-domains/ index.post.ts · [id]/index.delete.ts
├── competency-framework/    index.get.ts
├── conversations/      index.get.ts · [id]/messages.get.ts · [id]/messages.post.ts
├── course-assignments/ index.get.ts · index.post.ts · [id].get.ts · [id].put.ts · [id].delete.ts
├── course-notes/       (même schéma CRUD complet)
├── courses/            (même schéma CRUD complet)
├── dashboard/          risk.get.ts · summary.get.ts
├── events/             [id]/attendance.post.ts · [id]/attendance.delete.ts · [id]/notes.post.ts
├── health.get.ts
├── invitations/        index.get.ts · index.post.ts · [id].delete.ts · token/[token].get.ts
├── notifications/      index.get.ts · [id]/read.post.ts · read-all.post.ts · unread-count.post.ts (get)
├── presence-entries/   index.get.ts · index.post.ts · [id]/index.delete.ts · [id]/revisions.get.ts
├── profiles/           CRUD complet
├── progress-reports/   index.get/post · [id]/index.get/put/delete · [id]/{submit,review,sign}.post.ts
├── project-assignments/ CRUD + [id]/updates/index.get.ts · index.post.ts
├── projects/           CRUD complet
├── report-cards/       index.get.ts · [id]/index.get.ts · [id]/sign.post.ts
├── report-periods/     index.get/post · [id]/index.get/delete · [id]/publish.post.ts
├── tutor-visits/       index.get/post · [id]/index.get/put/delete
├── tutors/             [id]/learners/index.get/post · [id]/learners/available.get.ts · [id]/learners/[learnerId].delete.ts
└── users/              [id]/{attendance,calendar,competencies,livret,overview}.get.ts
```

Conventions relevées :

- **Nom de fichier = méthode HTTP** : `index.get.ts`, `index.post.ts`, `[id].put.ts`,
  `[id].delete.ts`. Deux styles coexistent pour l'item : `[id].get.ts` à plat (courses,
  projects…) ou sous-dossier `[id]/index.get.ts` dès qu'il existe des sous-actions
  (`[id]/read.post.ts`, `[id]/sign.post.ts`, `[id]/publish.post.ts`).
- **Actions métier = POST sur un sous-chemin verbal** : `submit`, `review`, `sign`,
  `publish`, `read`, `read-all` — jamais de verbe dans le corps.
- **Un seul nom de paramètre par segment dans un même dossier** (règle AGENTS.md) :
  `[id]` partout ; cas divergents isolés dans un sous-dossier explicite
  (`invitations/token/[token].get.ts`, `tutors/[id]/learners/[learnerId].delete.ts`).
- Ressources imbriquées quand la propriété est structurelle :
  `project-assignments/[id]/updates/`, `tutors/[id]/learners/`, `users/[id]/overview`.
- À côté : `server/middleware/auth-guard.ts` (garde 401 globale sur `/api/**`),
  `server/plugins/` (`zod-locale.ts`, `temp-account.ts`), `server/utils/` (helpers par
  ressource + `prisma.ts`, `require-role.ts`, `network.ts`).

## 2. Pattern type d'un handler Nitro

### GET liste — `server/api/courses/index.get.ts`

```ts
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { coursePersonSelect } from '~/server/utils/courses'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const where = user.role === Role.Tutor
    ? { createdById: user.id }
    : { assignments: { some: { studentId: user.id } } }
  return prisma.course.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: coursePersonSelect } }
  })
})
```

### POST création — `server/api/courses/index.post.ts`

```ts
export default defineEventHandler(async (event) => {
  const tutor = await requireRole(event, Role.Tutor)

  const parsed = courseCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données de cours invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }
  // `createdById` vient de la session, jamais du body.
  return prisma.course.create({
    data: { ...parsed.data, createdById: tutor.id },
    include: { createdBy: { select: coursePersonSelect } }
  })
})
```

### PUT — `server/api/courses/[id].put.ts`

```ts
const id = z.guid().safeParse(getRouterParam(event, 'id'))
if (!id.success) {
  throw createError({ statusCode: 400, statusMessage: 'Identifiant de cours invalide.' })
}
await loadCourseOwnedBy(id.data, tutor)   // 404 si hors périmètre
const parsed = courseUpdateSchema.safeParse(await readBody(event))
// ...même bloc 400, puis prisma.course.update(...)
```

### Squelette commun (à reproduire tel quel)

1. `defineEventHandler(async (event) => { ... })` — **jamais** `readValidatedBody` /
   `getValidatedQuery` / `getValidatedRouterParams` (zéro occurrence dans le dépôt) :
   toujours `schema.safeParse(await readBody(event))`, `schema.safeParse(getQuery(event))`
   et `z.guid().safeParse(getRouterParam(event, 'id'))`.
2. **Session d'abord** : `requireAuth(event)` ou `requireRole(event, Role.Tutor)` depuis
   `~/server/utils/require-role.ts` (wrappers autour de `requireUserSession` de
   nuxt-auth-utils ; 403 « Accès refusé. »). La garde globale
   `server/middleware/auth-guard.ts` renvoie déjà 401 « Authentification requise. » sur
   tout `/api/**` non public (`shared/utils/public-routes.ts`).
3. **Erreurs** : `createError({ statusCode, statusMessage })`, messages **en français,
   phrase complète avec point final**. Pour une erreur de validation : 400 +
   `data: { issues: formatZodIssues(parsed.error) }` (`formatZodIssues` vit dans
   `shared/utils/auth-credentials.ts` et renvoie `{ path, message }[]`).
4. **Ownership** : helpers `loadXOwnedBy` / `loadXVisibleTo` / `assertTutorOwnsLearner`
   dans `server/utils/<ressource>.ts`, qui lèvent **404** (« Cours introuvable. ») plutôt
   que 403 pour ne pas fuiter l'existence de la ressource. Les `select` partagés y sont
   exportés (`coursePersonSelect`).
5. **Prisma** : `import { prisma } from '~/server/utils/prisma'` — singleton
   `PrismaClient` sur `PrismaPg({ connectionString: process.env.DATABASE_URL })`, mémoïsé
   sur `globalThis.__prisma` hors production. Les **valeurs** d'enum Prisma
   (`import { Role } from '@prisma/client'`) sont autorisées côté serveur uniquement.
6. **Retour** : l'objet/tableau Prisma directement (ou un objet composé,
   ex. `{ notifications, reminders }`) — pas d'enveloppe `{ data, error }`.
7. Les schémas Zod vivent dans `shared/utils/<ressource>.ts` (create + update partiel avec
   `.refine((d) => Object.keys(d).length > 0, { message: 'Au moins un champ doit être fourni.' })`),
   IDs via `z.guid()` (jamais `z.uuid()`), types exportés en `z.input<typeof schema>`.
   Les champs de propriété (`createdById`) sont **absents des schémas** : forcés depuis la session.

## 3. Pagination

- **Un seul endpoint paginé** : `server/api/notifications/index.get.ts` — offset simple :
  `skip` validé par `notificationListQuerySchema`
  (`shared/utils/notifications.ts` : `z.object({ skip: z.coerce.number().int().min(0).max(5000).optional() })`)
  et `take: NOTIFICATION_PAGE_SIZE` (constante 50 exportée du même fichier partagé). Le
  client incrémente `skip` (bouton « charger plus »). Pas de total renvoyé.
- Ailleurs : listes complètes non paginées, filtrées par query validée
  (ex. `presence-entries/index.get.ts` : `studentId`, `from`, `to` via
  `presenceEntryListQuerySchema` + `getQuery`), ou `take: N` en dur pour les dashboards
  (`dashboard/summary.get.ts`, `users/[id]/overview.get.ts`).
- **Conclusion** : pour la page offres, le pattern « maison » à imiter est
  `skip` + `PAGE_SIZE` constant dans `shared/utils/`, message d'erreur
  « Paramètres de pagination invalides. ». Un pattern page/limit ou cursor serait une
  nouveauté à décider explicitement.

## 4. Structure `pages/` et navigation (pas de `layouts/`)

- **Aucun dossier `layouts/`** : la coquille unique est `app.vue` — nav `fixed` top
  (style Linear), liens conditionnés par rôle (`isTutor` / `isLearner` calculés depuis
  `useUserSession()` + `Role` de `~/shared/utils/enums`), menu mobile en `<Transition>`,
  `<NuxtPage />` centré dans `max-w-7xl mx-auto` sauf pages « full bleed »
  (`/`, `/features`, `/login`, `/register` — listes en dur dans `app.vue`), footer
  marketing ou minimal selon la route, plus `<LearnerDock />` (dock bas-droit de « Suivi »
  avec `LearnerFocusSwitcher`).
- **Pages** : une route = un `.vue` sous `pages/` (`alternants/index.vue`,
  `alternants/[id]/index.vue`, `bulletins/carte/[id].vue`…). Noms de routes en français
  (`annonces`, `presences`, `visites`, `rapports`, `competences`) ou anglais hérité
  (`courses`, `projects`, `dashboard`, `calendar`) — les nouveaux modules récents sont en français.
- **Middlewares route** : `middleware/auth.global.ts` (redirige vers
  `/login?redirect=...` sauf routes publiques) et `middleware/role.ts` activé par page :

  ```ts
  definePageMeta({ middleware: ['role'], requireRole: 'Tutor' })  // → /forbidden sinon
  ```
- **Consommation de l'API** (modèle : `pages/alternants/index.vue`) :
  - Lecture SSR : `await useFetch<T>('/api/...', { default: () => [] })`, URL réactive en
    fonction fléchée quand elle dépend de la session
    (`() => \`/api/tutors/${tutorId.value}/learners\``, `immediate: !!tutorId.value`).
    Les données s'exposent en `computed(() => data.value ?? [])`.
  - Mutations : `$fetch('/api/...', { method: 'POST', body })` **dans un handler
    d'événement** (jamais au setup — règle AGENTS.md), puis
    `await Promise.all([refresh(), refreshX()])` et `useToast().add({ title, color: 'success' })`.
  - Erreurs : helper local `readErrorMessage(err)` qui lit
    `e.data?.statusMessage || e.data?.issues?.[0]?.message || e.statusMessage`, affiché
    dans un `UAlert color="error" variant="soft"` ou un toast `color: 'error'`.
  - Types des payloads : interfaces locales à la page ou types importés de
    `shared/utils/` — pas de couche « composable API » ni de store.
- **Pinia** : installé (`@pinia/nuxt`) mais **aucun store** (`defineStore` introuvable).
  L'état transversal passe par `useState` dans `composables/`
  (`useNotificationCountState.ts`, `useLearnerFocus.ts`). Suivre cette voie.

## 5. Composants Nuxt UI récurrents

Comptage dans `pages/` + `components/` : `UButton` (115), `UFormField` (77), `UAlert` (45),
`UInput` (43), `UIcon` (38), `UBadge` (33), `UModal` (23), `UForm` (21), `UTextarea` (18),
`UTooltip` (12), `USelect` (9), `USelectMenu` (7), `UCheckbox` (3), `UTable` (2), `UTabs` (1),
`UPopover` (1). Pas de `UCard` ni de `UAuthForm` (interdit — `UForm` + `UFormField` + `UInput`
avec `v-model` explicite).

- **Formulaires** : `UForm :state :schema @submit` avec schéma Zod partagé, boutons
  Annuler (`variant="ghost"`) / Soumettre (`:loading`), dans le slot `#body` d'un
  `UModal v-model:open` titré. Modale de confirmation destructive avec `UButton color="error"`.
- **Cartes** : pas de `UCard` — divs stylées à la main :
  `rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5`,
  états vides en bordure pointillée + texte muted. Couleurs via variables CSS
  `var(--ui-*)` partout (thème clair/sombre automatique).
- **En-tête de page** : composant maison `components/PageHeader.vue`
  (`title`, `subtitle`, slot `#actions`). Badges de statut maison :
  `ReportStatusBadge`, `VisitStatusBadge`, `RiskBadge`, `AttendanceBadge`, `CompetencyLevelBadge`.
- **Modèle pour la future page offres** : `pages/alternants/index.vue` est le meilleur
  gabarit — bascule cards/tableau via `UTabs` (`:content="false"`), `UTable`
  (`:columns` typé `TableColumn<T>[]`, `:data`, `:loading="status === 'pending'"`,
  `empty="..."`, slots `#<colonne>-cell="{ row }"` avec `row.original`), et
  `USelectMenu` avec recherche (`:filter-fields`, `:search-input`). **Aucun tableau avec
  filtres/recherche server-side n'existe encore** : le filtrage existant est soit
  client-side, soit par query validée côté API (presences) — à composer pour les offres.
- Icônes : toujours `i-lucide-*` (collection locale `@iconify-json/lucide`).

## 6. Patterns de tests

- `tests/shared/<module>.test.ts` — miroir 1:1 du nom du fichier testé dans
  `shared/utils/` (18 fichiers). `vitest.config.ts` : environnement `node`,
  `globals: false` (imports explicites), alias `~` → racine.
- Style : `import { describe, expect, it } from 'vitest'`, un `describe` par fonction ou
  schéma exporté, **libellés d'`it` en français** décrivant le comportement
  (« refuse un corps vide », « nettoie le titre »). Constantes UUID factices en tête de
  fichier (`'11111111-1111-...'`).
- Périmètre : uniquement la logique pure et les schémas Zod de `shared/utils/`
  (`safeParse` + assertions sur `success` et `data`). **Aucun test des routes
  `server/api/`** ni des composants — vérification manuelle (curl/navigateur) exigée par AGENTS.md.

## 7. `shared/utils/`

Un fichier par domaine (`courses.ts`, `notifications.ts`, `presence-entries.ts`,
`invitations.ts`, `risk.ts`…), tous **purs** (zéro import Prisma/serveur — commentaire
d'en-tête « Module PUR » dans plusieurs). Contenu type :

- schémas Zod create/update + query (`notificationListQuerySchema`), messages en français ;
- types dérivés `export type XInput = z.input<typeof xSchema>` et interfaces de payloads API ;
- constantes (`NOTIFICATION_PAGE_SIZE`), maps de métadonnées label + icône lucide
  (`NOTIFICATION_META: Record<Type, { label, icon }>`) ;
- fonctions pures testables (`assignmentRangeIsValid`, `invitationStatus`, `workedMinutes`) ;
- exports **nommés** uniquement, JSDoc en français sur les règles métier.

`enums.ts` : miroir des enums Prisma en `const` object + type
(`export const Role = {...} as const ; export type Role = (typeof Role)[keyof typeof Role]`),
seule source côté client. `auth-credentials.ts` héberge `formatZodIssues` (utilisé par tous
les handlers) et `public-routes.ts` les listes de routes publiques (pages + API).

## 8. Config, build, CI, déploiement

- **`nuxt.config.ts`** : modules `@nuxt/ui`, `@pinia/nuxt`, `@vueuse/nuxt`, `@nuxt/image`,
  `nuxt-auth-utils` ; `ui: { fonts: false }` (Mona Sans self-hostée via CSS fontsource) ;
  `typescript.strict: true, typeCheck: false` (le typecheck est un job CI séparé).
  **runtimeConfig** : `databaseUrl: process.env.DATABASE_URL` (serveur),
  `session.cookie.secure: true` (surchargeable par `NUXT_SESSION_COOKIE_SECURE`),
  `public.appVersion` ← `APP_VERSION`. Convention Nuxt : toute nouvelle variable d'env se
  déclare ici et se surcharge en `NUXT_*` au runtime.
- **Zod FR en double** : `plugins/zod-locale.ts` (`defineNuxtPlugin`) **et**
  `server/plugins/zod-locale.ts` (`defineNitroPlugin`), tous deux `z.config(fr())`.
- **Prisma** : `prisma.config.ts` (`defineConfig` — schéma `./prisma/schema.prisma`,
  migrations `./prisma/migrations`, `datasource.url` depuis `DATABASE_URL` avec placeholder) ;
  client instancié une seule fois dans `server/utils/prisma.ts` via `@prisma/adapter-pg`
  (`PrismaPg`), generator `prisma-client-js`.
- **ESLint** : `eslint.config.mjs` (flat config) — `no-restricted-imports` sur
  `@prisma/client` pour le code client (« importer les énumérations depuis
  ~/shared/utils/enums ») ; husky + lint-staged (`eslint --cache --fix` sur `*.{js,ts,vue}`).
- **Scripts npm** : `dev`, `build`, `preview`, `start`, `lint`, `lint:fix`,
  `test` (`vitest run`), `test:watch`, `postinstall: nuxt prepare`.
- **CI `.github/workflows/ci.yml`** (PR et push sur `dev`/`main`, job unique
  « Typecheck, test, build », Node 22) : `npm ci` → `npx prisma generate` →
  `npx nuxt prepare` → `npx vue-tsc --noEmit` → `npm test` → `npx nuxt build`.
  Reproduire cette séquence en local avant toute PR. La CI **ne déploie pas**.
- **Dockerfile multi-stage** (`node:22-alpine`) : stage builder (npm ci + prisma generate
  + nuxt build) → stage runner (deps prod `--omit=dev --ignore-scripts`, prisma generate,
  copie `.output/`, user non-root uid 10001, healthcheck `GET /api/health`).
  **CMD : `npx prisma migrate deploy && node .output/server/index.mjs`** — les migrations
  s'appliquent au démarrage du conteneur.
- **`docs/deploy-dokploy.md`** : deux ressources Dokploy séparées (Database Postgres 16
  sans port externe + Application buildée depuis le Dockerfile, port 3000, Auto Deploy sur
  push de la branche). Env requises : `DATABASE_URL`, `NUXT_SESSION_PASSWORD`, `NODE_ENV`,
  `APP_VERSION` ; optionnelles : `NUXT_SESSION_COOKIE_SECURE`, `TEMP_LOGIN`/`TEMP_PASS`/
  `TEMP_ROLE` (staging). **Aucune scheduled task Dokploy n'est mentionnée** (seul le backup
  Postgres natif est évoqué, en remplacement d'un cron `pg_dump`) : un futur job de veille
  planifié devra introduire son propre mécanisme (tâche Nitro, cron Dokploy à documenter…).

## 9. Enums Prisma et miroirs

9 enums dans `prisma/schema.prisma` :

| Enum Prisma (ligne) | Valeurs | Miroir client |
|---|---|---|
| `Role` (12) | Tutor, Alternant, Stagiaire | `shared/utils/enums.ts` |
| `ProjectStatus` (18) | non_demarre, en_cours, termine, annule | `shared/utils/enums.ts` |
| `AttendanceStatus` (243) | present, absent, retard, excuse | `shared/utils/enums.ts` |
| `ReportStatus` (250) | brouillon, soumis, valide, a_revoir | `shared/utils/enums.ts` |
| `PresenceKind` (273) | entreprise_sur_site, … | **`shared/utils/presence-entries.ts`** (type union + `PRESENCE_KINDS as const satisfies readonly PresenceKind[]`) |
| `PresenceRevisionAction` (280) | — | pas de miroir valeur côté client |
| `VisitStatus` (391) | planifiee, realisee, annulee | `shared/utils/enums.ts` |
| `CompetencyLevel` (457) | decouverte, en_cours, acquis, maitrise | `shared/utils/enums.ts` |
| `SignatureDocumentType` (570) | bulletin, rapport | `shared/utils/enums.ts` |

Convention : toute nouvelle enum Prisma **doit** être répercutée en `const` object dans
`shared/utils/enums.ts` (ou en type union + tableau `as const satisfies` dans le module de
domaine, façon `PresenceKind`) — jamais importée de `@prisma/client` côté client.

---

## Modèle à suivre pour un nouvel endpoint

Exemple annoté pour une ressource `offers` (veille d'offres) :

```
server/api/offers/
├── index.get.ts        # liste (query validée, filtre par rôle/réseau)
├── index.post.ts       # création
├── [id]/index.get.ts   # détail        ← sous-dossier si sous-actions prévues
├── [id]/index.put.ts   # mise à jour partielle
├── [id]/index.delete.ts
└── [id]/archive.post.ts  # action métier = POST verbal
```

```ts
// server/api/offers/index.post.ts
import { Role } from '@prisma/client'                     // valeurs d'enum : serveur SEULEMENT
import { prisma } from '~/server/utils/prisma'            // singleton adapter-pg
import { requireRole } from '~/server/utils/require-role' // ou requireAuth
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { offerCreateSchema } from '~/shared/utils/offers' // schéma partagé + testé

export default defineEventHandler(async (event) => {
  // 1. Session/rôle (la garde globale a déjà renvoyé 401 si non connecté)
  const tutor = await requireRole(event, Role.Tutor)

  // 2. Validation : safeParse + 400 français + data.issues
  const parsed = offerCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "Données d'offre invalides.",
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  // 3. Champs de propriété forcés depuis la session, jamais depuis le body
  return prisma.offer.create({
    data: { ...parsed.data, createdById: tutor.id }
  })
})
```

Pour un handler `[id]` : valider avec `z.guid().safeParse(getRouterParam(event, 'id'))`
(400 « Identifiant … invalide. »), puis passer par un loader
`loadOfferOwnedBy(id, user)` / `loadOfferVisibleTo(id, user)` à créer dans
`server/utils/offers.ts` (404 « Offre introuvable. » si hors périmètre, `select` partagés
exportés du même fichier). Pour une liste filtrée/paginée : `offerListQuerySchema` dans
`shared/utils/offers.ts` (`z.coerce` pour les nombres/dates, `skip` borné + `OFFER_PAGE_SIZE`
constant, sur le modèle notifications), erreur 400 « Filtres invalides. ».
Accompagner le tout d'un `tests/shared/offers.test.ts` (describe par schéma, libellés français).

## Modèle à suivre pour une nouvelle page

```vue
<!-- pages/offres/index.vue -->
<template>
  <div class="w-full px-6 py-10 space-y-6">
    <PageHeader title="Veille d'offres" :subtitle="`${offers.length} offres`">
      <template #actions>
        <UButton color="neutral" icon="i-lucide-plus" @click="openCreate">Ajouter</UButton>
      </template>
    </PageHeader>

    <UAlert v-if="error" color="error" variant="soft" :title="error.statusMessage ?? 'Erreur de chargement'" />

    <!-- État vide : bordure pointillée + texte muted ; sinon UTable ou grille de cards -->
    <UTable :columns="columns" :data="offers" :loading="status === 'pending'" empty="Aucune offre." />

    <!-- Création/édition : UForm + schéma Zod partagé dans le #body d'un UModal -->
    <UModal v-model:open="createOpen" title="Ajouter une offre">
      <template #body>
        <UForm :state="formState" :schema="offerCreateSchema" class="space-y-4" @submit="onSubmit">
          <UFormField label="Titre" name="title" required>
            <UInput v-model="formState.title" class="w-full" />
          </UFormField>
          <UAlert v-if="formError" color="error" variant="soft" :title="formError" />
          <div class="flex justify-end gap-2 pt-2">
            <UButton color="neutral" variant="ghost" @click="createOpen = false">Annuler</UButton>
            <UButton type="submit" color="neutral" :loading="pending">Ajouter</UButton>
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { offerCreateSchema, type OfferListItem } from '~/shared/utils/offers'

definePageMeta({ middleware: ['role'], requireRole: 'Tutor' })  // si page réservée

const toast = useToast()

// Lecture SSR : useFetch + default, jamais $fetch nu au setup
const { data, status, error, refresh } = await useFetch<OfferListItem[]>(
  '/api/offers', { default: () => [] }
)
const offers = computed(() => data.value ?? [])

const columns: TableColumn<OfferListItem>[] = [ /* accessorKey/header, slots #x-cell */ ]

// Mutation : $fetch dans le handler, puis refresh() + toast ; erreurs via readErrorMessage
async function onSubmit() {
  pending.value = true
  formError.value = null
  try {
    await $fetch('/api/offers', { method: 'POST', body: { ...formState } })
    createOpen.value = false
    await refresh()
    toast.add({ title: 'Offre ajoutée', color: 'success' })
  } catch (err: unknown) {
    formError.value = readErrorMessage(err) ?? "Impossible d'ajouter cette offre."
  } finally {
    pending.value = false
  }
}
</script>
```

Points d'attache : lien de nav à ajouter **dans `app.vue`** (desktop + menu mobile,
conditionné par rôle) ou dans `LearnerDock.vue` pour la famille « Suivi » ; libellés,
toasts et messages en français ; styles via variables `var(--ui-*)` ; icônes `i-lucide-*` ;
état partagé éventuel via un composable `useState`, pas de store Pinia.
