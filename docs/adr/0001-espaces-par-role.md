# ADR-0001 — Espaces par rôle : `/tuteur` et `/alternant`

Statut : proposé (2026-08-29)

## Contexte

L'app est bi-rôle de fait (rapport `docs/plans/discovery/a-auth-roles.md`) : un seul modèle
`User` avec `role ∈ { Tutor, Alternant, Stagiaire }`, 26 pages sous `pages/` dont ~11
« mixtes » qui branchent leur UI sur `user.role` dans le composant. Il n'y a **pas de
dossier `layouts/`** (shell dans `app.vue`), la protection de rôle côté client est
**opt-in** (`middleware/role.ts` + `definePageMeta.requireRole`, absent des pages mixtes),
et `shared/utils/auth-redirect.ts` pointe les trois rôles vers `/dashboard`. La sécurité
réelle est côté serveur et n'est pas modifiée par cet ADR : le split est un chantier
front/UX.

## Décision

### 1. Préfixes d'URL : `/tuteur/...` et `/alternant/...`

Les modules récents du dépôt sont nommés en français (`annonces`, `presences`, `rapports`,
`visites`, `competences`) : `/tuteur` et `/alternant` suivent cette convention. Le rôle
**Stagiaire partage l'espace `/alternant`** (même navigation, mêmes pages — comme
aujourd'hui pour `/courses` et `/missions` qui acceptent les deux rôles).

Les **segments existants gardent leur nom** (pas de francisation de `calendar`, `courses`,
`projects`, `dashboard` à cette occasion) : cela rend la table de redirection et la
migration des liens en base purement préfixielle, donc mécanique. Une francisation
éventuelle est un chantier séparé.

Restent **hors espace** (communs, auth seule, tous rôles) : `/account` et
`/notifications`. Leur contenu est identique quel que soit le rôle (profil du compte,
centre de notifications) ; les éclater dupliquerait deux pages sans aucune divergence.

### 2. Sort de chaque page existante

| Ancienne route | Espace tuteur | Espace alternant (+ Stagiaire) |
|---|---|---|
| `/` , `/features`, `/login`, `/register`, `/forbidden` | inchangées (publiques) | inchangées |
| `/account`, `/notifications` | inchangées (communes) | inchangées |
| `/dashboard` | `/tuteur/dashboard` | `/alternant/dashboard` |
| `/calendar` | `/tuteur/calendar` | `/alternant/calendar` |
| `/presences` | `/tuteur/presences` | `/alternant/presences` |
| `/annonces` | `/tuteur/annonces` | `/alternant/annonces` |
| `/messages`, `/messages/[id]` | `/tuteur/messages(/[id])` | `/alternant/messages(/[id])` |
| `/rapports`, `/rapports/[id]` | `/tuteur/rapports(/[id])` | `/alternant/rapports(/[id])` |
| `/bulletins` | `/tuteur/bulletins` | `/alternant/bulletins` |
| `/bulletins/[id]` (Tutor only) | `/tuteur/bulletins/[id]` | — |
| `/bulletins/carte/[id]` | `/tuteur/bulletins/carte/[id]` | `/alternant/bulletins/carte/[id]` |
| `/competences` | `/tuteur/competences` | `/alternant/competences` |
| `/visites` | `/tuteur/visites` | `/alternant/visites` |
| `/alternants`, `/alternants/[id]`, `/alternants/[id]/livret` (Tutor only) | `/tuteur/alternants/...` | — |
| `/projects`, `/projects/[id]` (Tutor only) | `/tuteur/projects/...` | — |
| `/courses` (apprenant only) | — | `/alternant/courses` |
| `/missions` (apprenant only) | — | `/alternant/missions` |
| *(nouveau, ADR-0004)* | — | `/alternant/offres` |

**Pages mixtes à éclater** (les 10 lignes à double colonne ci-dessus) : chaque page devient
deux `.vue` minces sous `pages/tuteur/` et `pages/alternant/` ; la logique commune (fetchs,
tableaux, modales) est extraite en composants partagés dans `components/` quand la
duplication dépasse le trivial (ex. `calendar` et `messages` sont quasi identiques entre
rôles ; `dashboard` et `presences` divergent fortement et deviennent deux vraies pages).
Les branches `v-if="isTutor"` internes disparaissent au profit de la route.

### 3. Layouts : introduction du dossier `layouts/`

On introduit `layouts/` (mécanisme Nuxt standard, fonctionne à la racine sans dossier
`app/`) plutôt que d'empiler d'autres `v-if` dans `app.vue` :

- `layouts/public.vue` — landing/marketing (nav publique + footer marketing) ;
- `layouts/tuteur.vue` — shell tuteur (nav actuelle côté `isTutor`) ;
- `layouts/alternant.vue` — shell apprenant (nav `isLearner` + `LearnerDock`).

`app.vue` se réduit à `<NuxtLayout :name="layoutName"><NuxtPage /></NuxtLayout>` où
`layoutName` est **calculé depuis le préfixe de route** (`/tuteur/*` → `tuteur`,
`/alternant/*` → `alternant`, pages publiques → `public`, sinon layout `default` minimal
pour `/account`, `/notifications`, `/forbidden`). Choisir le layout par préfixe (et non
par `definePageMeta({ layout })` page par page) évite 30 déclarations répétitives et rend
impossible l'oubli sur une nouvelle page. Justification de l'abandon du shell unique :
les listes en dur de `app.vue` (« full bleed », footer conditionnel) sont déjà le symptôme
d'un shell qui fait trop de choses ; le rapport A (§7, risque 5) recommandait ce refactor.

### 4. Garde par préfixe (généralisation de `middleware/role.ts`)

La protection actuelle est opt-in et absente des 11 pages mixtes (risque 3 du rapport A).
On la remplace par une **garde par préfixe** dans un middleware global
`middleware/space.global.ts` (exécuté après `auth.global.ts`) :

```ts
// shared/utils/auth-redirect.ts (module pur, testable)
const SPACE_PREFIXES: Record<string, Role[]> = {
  '/tuteur': [Role.Tutor],
  '/alternant': [Role.Alternant, Role.Stagiaire]
}
export function rolesAllowedFor(path: string): Role[] | null { /* match par préfixe */ }
```

Le middleware redirige vers `/forbidden` si `user.role` n'est pas dans la liste du
préfixe. `middleware/role.ts` et `definePageMeta.requireRole` sont **supprimés** (plus
aucune page n'en a besoin : toute page protégée par rôle vit sous un préfixe d'espace).
Côté serveur, rien ne change (la vraie sécurité reste `requireRole` +
`assertCanViewStudent` dans `server/api/`).

### 5. Redirection post-login

`DEFAULT_LANDING` dans `shared/utils/auth-redirect.ts` devient :

```ts
{ Tutor: '/tuteur/dashboard', Alternant: '/alternant/dashboard', Stagiaire: '/alternant/dashboard' }
```

`resolvePostLoginPath` est durci : un `?redirect=` pointant vers un préfixe d'espace
**interdit au rôle** (via `rolesAllowedFor`) est ignoré au profit du landing par rôle —
plus de rebond `/login` → page → `/forbidden`.

### 6. Redirections des anciennes routes

Table unique `LEGACY_ROUTES` dans `shared/utils/legacy-routes.ts` (ancien chemin →
`{ tuteur, alternant }` ou cible unique), consommée par un middleware global
`middleware/legacy-redirect.global.ts` :

- routes mono-rôle (`/alternants/*`, `/projects/*` → tuteur ; `/courses`, `/missions` →
  alternant) : `navigateTo(cible, { redirectCode: 301 })` (cible fixe, cacheable) ;
- routes ex-mixtes (`/dashboard`, `/calendar`…) : cible **dépendante du rôle de session**
  → `redirectCode: 302` (jamais 301 : la réponse varie selon l'utilisateur) ; si non
  connecté, `auth.global.ts` a déjà envoyé vers `/login` et le `?redirect=` legacy sera
  re-résolu après login.

Un middleware côté client/SSR (plutôt que `routeRules`) est requis précisément parce que la
cible dépend de la session.

### 7. Liens en dur

- **`Notification.link` en base** : migration de données SQL dans la migration Prisma du
  lot (UPDATE par préfixe sur `notifications.link`, ex. `'/alternants…'` →
  `'/tuteur/alternants…'`). Les liens ex-mixtes non migrables sans connaître le rôle du
  destinataire (`/rapports/[id]`…) sont migrés en joignant `users.role` (le destinataire
  de la notification détermine l'espace). Le middleware legacy reste le filet de sécurité.
- **Sites de création** : tous les `link:` de `server/api/**` (`register.post.ts` →
  `/alternants`, `notifyUser` des modules rapports/bulletins/messages…) sont mis à jour
  pour émettre des liens préfixés selon le rôle du destinataire.
- **Nav et `navigateTo` internes** : repris lors de l'éclatement des pages ; un
  `grep -rn "navigateTo('/\|to=\"/" pages/ components/ app.vue` fait partie de la
  checklist de vérification du lot.

## Conséquences

- ~20 nouveaux fichiers `.vue` (pages minces) + 4 layouts ; `app.vue` fortement réduit.
- Deux middlewares globaux nouveaux (`space.global.ts`, `legacy-redirect.global.ts`),
  `middleware/role.ts` supprimé, `types/page-meta.d.ts` allégé.
- Migration de données sur `notifications.link` (réversible : les anciens chemins restent
  résolus par le middleware legacy).
- Le rôle étant figé dans le cookie de session (rapport A, risque 1), un changement de
  rôle en base laisse l'utilisateur dans le « mauvais » espace jusqu'à reconnexion —
  accepté en v1, documenté.

## Alternatives écartées

- **Continuer le branchement `v-if` par rôle dans des pages uniques** : c'est l'état
  actuel ; illisible à 11 pages mixtes, protection opt-in trouée, impossible d'avoir deux
  navigations distinctes.
- **`definePageMeta({ layout, middleware })` page par page** : répétitif (30+ pages),
  chaque oubli est une régression silencieuse ; le préfixe d'URL est une source de vérité
  plus robuste.
- **`routeRules` Nitro pour les redirections** : impossible pour les routes ex-mixtes
  (cible dépendante de la session), et double source de vérité avec la table partagée.
- **Préfixes `/tutor` / `/student`** : incohérents avec la convention française des
  modules récents et avec le vocabulaire produit (tuteur / alternant).
