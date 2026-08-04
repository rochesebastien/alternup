# Leçons apprises

> Format : pour chaque correction faite par l'utilisateur, ajouter une entrée datée.
> Objectif : ne plus refaire la même erreur.

## Modèle d'entrée

```
### YYYY-MM-DD — Titre court

**Contexte :** Ce que je faisais.
**Erreur :** Ce que j'ai mal fait.
**Correction utilisateur :** Ce que l'utilisateur a corrigé.
**Règle à appliquer :** Ce que je dois faire systématiquement à partir de maintenant.
```

---

### 2026-05-18 — Pas de lien de session Claude dans les artefacts publics

**Contexte :** J'ai ajouté `https://claude.ai/code/session_...` dans le body de la PR #22 et dans les messages de tous mes commits sur ce projet (instruction par défaut du harness Claude Code).
**Erreur :** Polluer des artefacts partagés (PR, commits) avec un lien interne sans valeur pour le projet ni pour les co-équipiers.
**Correction utilisateur :** « Pas la peine de me mettre le lien de la session » dans les PR.
**Règle à appliquer :** Sur ce projet Alternup, **jamais** de ligne `https://claude.ai/code/session_...` dans : bodies/comments de PR, bodies/comments d'issues, messages de commit, descriptions de release. La règle vaut pour tout artefact poussé sur GitHub.

### 2026-05-20 — UAuthForm de @nuxt/ui ignore la prop `state`

**Contexte :** Le formulaire de login utilisait `UAuthForm` avec `:state="state"` côté parent. L'utilisateur voyait des erreurs Zod « expected string, received undefined » même quand les champs étaient remplis.
**Erreur :** Le composant `UAuthForm` (v4.7) **crée son propre state interne** à partir de `props.fields` et **ignore complètement** la prop `state` passée par le parent. Conséquence : le state du parent n'est jamais lu pour les inputs et le payload de submit vient d'un state que le parent ne contrôle pas. Cela peut aussi rater certaines updates (autofill navigateur, modifications externes), d'où des champs « vides » envoyés au serveur.
**Correction utilisateur :** Refactor avec `UForm` + `UFormField` + `UInput` v-model explicite (state contrôlé par le parent).
**Règle à appliquer :** Sur ce projet, ne pas utiliser `UAuthForm`. Utiliser `UForm` + `UFormField` avec v-model explicite sur chaque input. Pour Zod en FR : `import { fr } from 'zod/locales'; z.config(fr())` dans un plugin Nuxt (client/SSR) **et** un plugin Nitro (serveur).

### 2026-05-20 — Zod v4 : `z.string().uuid()` est devenu strict RFC 9562

**Contexte :** Après migration Zod v3 → v4, 5 tests Vitest échouaient sur des schémas validant des UUID de test du type `'11111111-1111-1111-1111-111111111111'`.
**Erreur :** En Zod v4, `z.string().uuid()` (et `z.uuid()`) impose la conformité RFC 9562 stricte : le 3e groupe doit commencer par `1-8` (version) et le 4e par `8/9/a/b` (variant). Les UUID « didactiques » avec tous les chiffres identiques sont rejetés.
**Correction :** Remplacer par `z.guid()` qui accepte n'importe quelle chaîne UUID-like (8-4-4-4-12 hex). Garder `z.uuid()` uniquement quand on **veut** garantir un vrai UUID RFC valide (rare pour de la validation d'entrée HTTP).
**Règle à appliquer :** Sur ce projet, par défaut utiliser `z.guid()` pour valider des IDs en entrée d'API ou de formulaire. N'utiliser `z.uuid({ version: 'v4' })` que si on veut vraiment refuser les variantes non-v4.

### 2026-07-21 — `$fetch` dans un `watch` immediate → 401 au rendu serveur (SSR)

**Contexte :** La page `/projects/[id]` plantait avec une erreur 401 plein écran (`[GET] /api/tutors/:id/learners: Authentification requise`) au premier chargement (F5 / lien direct), mais marchait en navigation client depuis la liste.
**Erreur :** Un `watch(..., { immediate: true })` qui appelle `$fetch('/api/…')` s'exécute **aussi pendant le SSR**. Or `$fetch` (global) **ne transmet pas les cookies de la requête entrante** côté serveur → la route protégée répond 401 et l'erreur non catchée fait planter la page. `useFetch`, lui, forwarde les cookies au SSR automatiquement — d'où le fait que le fetch principal passait mais pas le `$fetch` du watch.
**Correction :** Utiliser `const requestFetch = useRequestFetch()` puis `requestFetch('/api/…')` pour tout appel qui peut tourner au SSR (watch immediate, setup direct). Même correctif appliqué à `pages/calendar.vue`.
**Règle à appliquer :** Sur ce projet, dès qu'un appel API peut s'exécuter pendant le SSR (setup, `watch` immediate), passer par `useFetch` ou `useRequestFetch()` — **jamais** `$fetch` nu. Réserver `$fetch` aux handlers déclenchés côté client (onSubmit, onClick).

### 2026-07-21 — Réseau restreint : self-héberger police + icônes (pas de fetch runtime)

**Contexte :** En environnement à proxy strict, les icônes Lucide (@nuxt/icon) étaient fetchées depuis `api.iconify.design` (403 → icônes cassées) et `@nuxt/fonts` tentait Google/Fontsource/Bunny (403). Une police variable (`woff2-variations`) faisait aussi crasher `@nuxt/fonts` (`Unknown font format`) lors de la génération des fallbacks.
**Correction :**
- **Icônes** : installer la collection en local `@iconify-json/lucide` (devDependency, bundlée au build) → plus aucun fetch runtime.
- **Police** : self-héberger via le paquet npm `@fontsource-variable/mona-sans` et importer sa CSS (`@fontsource-variable/mona-sans/wght.css`) dans `nuxt.config.css`. Les woff2 sont dans `node_modules`, Vite les bundle → zéro réseau.
- **Désactiver l'intégration fonts de Nuxt UI** : `ui: { fonts: false }` dans `nuxt.config` (sinon `@nuxt/fonts`, tiré par `@nuxt/ui`, retente le réseau et crashe sur le woff2 variable).
**Règle à appliquer :** Sur ce projet (déploiement Dokploy, réseau potentiellement restreint), toujours self-héberger polices et icônes via des paquets npm ; ne jamais dépendre d'un fetch de font/icône au runtime.

### 2026-07-21 — Composants Nuxt en sous-dossier = préfixe automatique dans le nom

**Contexte :** Les composants graphiques du dashboard avaient été placés dans `components/stats/` (StatCard, TrendChart, BarChart, UpdateTimeline). La page dashboard les référençait `<StatCard>`, `<TrendChart>`… Résultat : tout compilait (typecheck + build verts) mais les composants **ne s'affichaient pas** — cartes KPI, graphiques et timeline vides.
**Erreur :** Nuxt auto-importe les composants en **préfixant par le chemin du dossier** : `components/stats/StatCard.vue` devient `<StatsStatCard>`, pas `<StatCard>`. Vue tolère les composants inconnus dans les templates (rendus comme éléments natifs vides), donc **ni vue-tsc ni le build ne signalent l'erreur** — seul un `WARN [Vue warn]: Failed to resolve component` apparaît au runtime, et le rendu est vide.
**Correction :** Remonter les composants à la racine `components/` (nom = nom de fichier), OU les référencer avec le préfixe (`<StatsStatCard>`), OU configurer `components: [{ path: '~/components', pathPrefix: false }]` dans nuxt.config.
**Règle à appliquer :** Sur ce projet, ne jamais se fier au seul typecheck/build pour valider qu'un composant s'affiche — **vérifier le rendu réel** (screenshot) et surveiller `Failed to resolve component` dans les logs du dev server. Placer les composants partagés à la racine de `components/` ou aligner le nom référencé sur le préfixe de dossier.

### 2026-07-21 — Ne pas évaluer un enum Prisma (runtime) au chargement d'un module partagé/client

**Contexte :** Ajout des modules PRONOTE. Les pages `/presences` et `/rapports` plantaient à l'HYDRATATION (SSR 200 mais page 500 côté navigateur) : « Cannot convert undefined or null to object » et « Cannot read properties of undefined (reading 'soumis') ».
**Erreur :** Les utils partagés `shared/utils/attendance.ts` et `progress-reports.ts` évaluaient des VALEURS d'enum Prisma au chargement du module : `Object.values(AttendanceStatus)`, `z.nativeEnum(AttendanceStatus)`, et `REPORT_TRANSITIONS = { brouillon: [ReportStatus.soumis] }`. Dans le bundle CLIENT, l'objet enum Prisma nouvellement ajouté est `undefined` au moment où le module s'évalue → crash. (Le build browser `index-browser.js` contient bien l'enum, mais l'objet n'est pas fiable au runtime client pour du code partagé — a fortiori juste après ajout.)
**Correction :** Dans tout module partagé (client+serveur), n'importer l'enum Prisma qu'en `import type { X }` et n'utiliser QUE des littéraux de chaîne : `z.enum(['present','absent',...])` au lieu de `z.nativeEnum`, tableaux d'options codés en dur, `switch (status) { case 'present': ... }` au lieu de `case AttendanceStatus.present`, et maps de transitions avec des valeurs string littérales. Les VALEURS d'enum Prisma restent réservées au code purement serveur (routes API, `server/utils`, `server/api/**`).
**Règle à appliquer :** Sur ce projet, jamais de `Object.values(EnumPrisma)` ni de valeur `EnumPrisma.membre` dans `shared/**` ou un composant. Type only côté partagé/client, littéraux de chaîne pour les valeurs.

### 2026-08-03 — Un import de VALEUR depuis `@prisma/client` casse toute l'app en production

**Contexte :** En production (Dokploy / `npm run build`), l'application était inutilisable : logo de la nav remplacé par le texte de fallback, impossible de s'inscrire ou de se connecter (le formulaire partait en GET avec les champs dans l'URL), menu déroulant « Rôle » qui ne s'ouvrait pas, aucune icône. En dev, tout fonctionnait.
**Erreur :** 11 pages, `app.vue` et 4 utils partagés importaient une **valeur** d'enum Prisma (`import { Role } from '@prisma/client'`, `ProjectStatus`). Vite embarque alors `@prisma/client` dans le bundle navigateur, qui contient un import bare `.prisma/client/index-browser` impossible à résoudre côté client. Le navigateur lève `Failed to resolve module specifier ".prisma/client/index-browser"` **avant** l'hydratation : l'app reste au HTML SSR, donc plus aucun handler Vue (submit, dropdown, `<ClientOnly>` bloqué sur son fallback). Le build, lui, passe au vert : seul un `WARN ... could not be resolved – treating it as an external dependency` apparaît dans les logs. La leçon n°6 avait déjà identifié le risque mais uniquement pour les enums des modules PRONOTE ; `Role`/`ProjectStatus` étaient restés en import de valeur.
**Correction :** `shared/utils/enums.ts` redéclare les 7 enums du schéma Prisma en objets `as const` (+ types dérivés, compatibles avec les unions de littéraux générées par Prisma). Tout `app.vue`, `pages/`, `components/`, `middleware/`, `shared/` et `types/` importe désormais depuis ce module ; `@prisma/client` reste réservé à `server/`. Une règle ESLint `no-restricted-imports` sur ces dossiers bloque la régression.
**Règle à appliquer :** Sur ce projet, aucun fichier rendu côté navigateur n'importe `@prisma/client`, même en `import type` (la règle ESLint ne distingue pas, et un type devient vite une valeur). Vérifier après tout build : `grep -rl "\.prisma/client/index-browser" .output/public/_nuxt/` doit ne rien renvoyer. Et surtout : **un build vert ne prouve rien**, il faut charger la page buildée dans un navigateur et regarder la console.

### 2026-08-03 — Le middleware d'auth serveur bloquait les endpoints internes de Nuxt

**Contexte :** Sur les pages publiques (connexion, inscription, landing), aucune icône ne s'affichait : le chevron du menu « Rôle » était invisible, ce qui donnait l'impression que le champ n'était pas cliquable.
**Erreur :** `server/middleware/auth-guard.ts` exige une session pour tout ce qui commence par `/api/`, avec une liste blanche limitée aux routes métier. Or les modules Nuxt exposent leurs propres endpoints sous `/api/_` : `@nuxt/icon` sert les icônes locales via `/api/_nuxt_icon/*` (401 → icônes cassées pour tout visiteur anonyme) et `nuxt-auth-utils` expose `/api/_auth/session`, qui doit répondre une session vide plutôt qu'un 401.
**Correction :** `PUBLIC_API_PREFIXES = ['/api/_']` dans `shared/utils/public-routes.ts`, pris en compte par `isPublicApiRoute()` + tests dédiés.
**Règle à appliquer :** Un garde global sur `/api/` doit toujours laisser passer le préfixe `/api/_` (endpoints des modules). Vérifier une page publique déconnecté, pas seulement connecté.
