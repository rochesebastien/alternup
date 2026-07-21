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
