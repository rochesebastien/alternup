# AGENTS.md

Ce fichier guide tous les assistants de code (Claude Code, Codex, Cursor, Gemini CLI, Copilot…) quand ils travaillent sur ce dépôt.

## Contexte projet

**Alternup** : application **Nuxt 4** monolithique (SSR) pour le suivi d'alternants et de
stagiaires par leurs tuteurs. Une seule base de code sert le front et l'API.

La migration hors Supabase est **terminée** (mai 2026) : plus aucune référence dans le code.
L'historique de cette migration est archivé dans `taches/a-faire.md`.

## Stack technique

| Domaine | Choix |
|---|---|
| Framework | **Nuxt 4.4** (SSR) + **Vue 3.5** + `vue-router` 5 |
| Langage | **TypeScript 6**, `strict: true` (typecheck via `vue-tsc`, pas au build Nuxt) |
| Runtime | **Node ≥ 22** |
| UI | **Nuxt UI 4** + **Tailwind CSS 4** (config CSS-first dans `assets/css/main.css`) |
| Icônes | `@nuxt/icon` + collection locale `@iconify-json/lucide` (aucun fetch runtime) |
| Police | **Mona Sans** self-hostée via `@fontsource-variable` (`ui: { fonts: false }`) |
| Images | `@nuxt/image`, provider `ipx` |
| État | **Pinia** (`@pinia/nuxt`), **VueUse** |
| Calendrier | **Schedule-X 4** (thème shadcn, drag & drop, resize) + `temporal-polyfill` |
| Animation | **GSAP** (plugin client uniquement) |
| API | **Nitro** — routes sous `server/api/` |
| ORM / DB | **Prisma 7** (`@prisma/adapter-pg`) sur **PostgreSQL 16** |
| Auth | **nuxt-auth-utils** (cookie de session signé) + **bcrypt** |
| Validation | **Zod 4** (locale FR via plugin Nuxt *et* plugin Nitro) |
| Qualité | **ESLint 10**, **Vitest 4**, Husky + lint-staged |
| Déploiement | **Docker** multi-stage → **Dokploy** (voir `docs/deploy-dokploy.md`) |

Le projet **n'a pas de dossier `app/`** : Nuxt 4 conserve donc la structure v3, tous les
dossiers (`pages/`, `components/`, `composables/`, `middleware/`, `plugins/`, `assets/`)
restent à la racine, à côté de `server/` et `shared/`.

## Règles de code non négociables

Ces règles viennent d'incidents réels — le détail et la cause racine sont dans `taches/lecons.md`.

- **Jamais d'import de `@prisma/client`** dans du code rendu côté navigateur (`app.vue`,
  `pages/`, `components/`, `composables/`, `middleware/`, `plugins/`, `shared/`), même en
  `import type`. Les énumérations viennent de `shared/utils/enums.ts`. Une règle ESLint
  `no-restricted-imports` bloque la régression.
- **Jamais de `$fetch` nu** dans un appel qui peut s'exécuter au SSR (setup, `watch`
  immediate) : utiliser `useFetch` ou `useRequestFetch()`, sinon les cookies ne sont pas
  transmis et la route protégée répond 401.
- **Pas de `UAuthForm`** : `UForm` + `UFormField` + `UInput` avec `v-model` explicite.
- **`z.guid()`** pour valider un ID en entrée d'API, pas `z.uuid()` (strict RFC 9562).
- **Un seul nom de paramètre par segment d'URL Nitro** dans un même dossier
  (`[id]` partout, ou sous-dossier explicite type `token/[token]`).
- **Polices et icônes toujours self-hébergées** — le réseau de production peut être filtré.
- **Un build vert ne prouve rien** : vérifier le rendu réel dans un navigateur, et après
  build `grep -rl "\.prisma/client/index-browser" .output/public/_nuxt/` doit ne rien renvoyer.

## Workflow de développement

### Orchestration du workflow

1. **Définir le mode Plan par défaut**
   - Passer en mode plan pour TOUTE tâche non triviale (3+ étapes ou décisions architecturales)
   - Si quelque chose dévie du plan, ARRÊTER et replanifier immédiatement — ne pas continuer à pousser
   - Utiliser le mode plan pour les étapes de vérification, pas seulement pour la construction
   - Écrire les spécifications détaillées en amont pour réduire l'ambiguïté

2. **Stratégie des sous-agents**
   - Utiliser les sous-agents de manière intensive pour garder le contexte principal propre
   - Déléguer la recherche, l'exploration et les analyses parallèles aux sous-agents
   - Pour les problèmes complexes, répartir plus de calcul via les sous-agents
   - Une tâche par sous-agent pour une exécution ciblée

3. **Boucle d'auto-amélioration**
   - Après TOUTE correction de l'utilisateur : mettre à jour `taches/lecons.md` avec le modèle
   - Écrire des règles pour soi-même qui empêchent de refaire la même erreur
   - Itérer sans relâche sur ces leçons jusqu'à ce que le taux d'erreur chute
   - Relire les leçons au début de chaque session pour les projets pertinents

4. **Vérifier avant de considérer comme terminé**
   - Ne jamais marquer une tâche comme terminée sans prouver que cela fonctionne
   - Repérer la différence entre le comportement principal et vos changements quand c'est pertinent
   - Se demander : « Un ingénieur senior validerait-il cela ? »
   - Exécuter des tests, vérifier les logs, démontrer que c'est correct

5. **Exiger de l'élégance (équilibrée)**
   - Pour les changements non triviaux : faire une pause et se demander « Y a-t-il une solution plus élégante ? »
   - Si un correctif semble bancal : « Connaissant tout ce que je sais maintenant, quelle serait la solution élégante ? »
   - Passer ce temps pour des corrections simples et évidentes — ne pas sur-ingénier
   - Défier son propre travail avant de le présenter

6. **Correction autonome des bugs**
   - Lorsqu'un bug est signalé : le corriger. Ne pas demander à l'utilisateur de le faire à votre place
   - Pointer vers les logs, erreurs et tests échoués — puis les résoudre
   - Ne pas exiger de changement de contexte de la part de l'utilisateur
   - Aller corriger les tests CI échoués sans qu'on vous dise comment

### Gestion des tâches

1. **Plan d'abord** : Écrire le plan dans `taches/a-faire.md` avec des éléments vérifiables
2. **Vérifier le plan** : Vérifier avant de commencer l'implémentation
3. **Suivre la progression** : Marquer les éléments comme terminés au fur et à mesure
4. **Expliquer les changements** : Résumé de haut niveau à chaque étape
5. **Documenter les résultats** : Ajouter une section de revue dans `taches/a-faire.md`
6. **Capturer les leçons** : Mettre à jour `taches/lecons.md` après les corrections

### Principes fondamentaux

- **Simplicité d'abord** : Rendre chaque changement aussi simple que possible. Impact minimal sur le code.
- **Aucune paresse** : Trouver les causes profondes. Pas de correctifs temporaires. Standards d'ingénieur senior.
- **Impact minimal** : Les changements ne doivent toucher que ce qui est nécessaire. Éviter d'introduire des bugs.

## Workflow Git

- **`main`** : branche de release. **Ne jamais y pousser ni ouvrir une PR directe** (sauf cas exceptionnel explicitement demandé par l'utilisateur).
- **`dev`** : branche d'intégration. Toutes les PRs feature ciblent `dev`.
- **`<numéro>-<slug>`** : branches feature, partent de `dev`, mergent vers `dev`.
- Promotion `dev → main` : décidée par l'utilisateur au moment d'une release. Ne pas la déclencher de soi-même.

## Commandes utiles

```bash
npm run dev          # Serveur Nuxt avec HMR (port 3000)
npm run build        # Build production (Nuxt + Nitro)
npm run preview      # Prévisualiser le build
npm run start        # Démarrer le build
npm run lint         # ESLint
npm run lint:fix     # ESLint --fix
npm test             # Vitest (run unique)
npm run test:watch   # Vitest en watch

npx vue-tsc --noEmit                   # Typecheck (identique à la CI)
npx prisma migrate dev --name <slug>   # Nouvelle migration
npx prisma studio                      # GUI sur la base
```

Avant de considérer un lot terminé, la CI exécute — dans cet ordre — `prisma generate`,
`nuxt prepare`, `vue-tsc --noEmit`, `npm test`, `nuxt build`. Reproduire la même séquence
en local plutôt que de découvrir un échec sur la PR.

## Tests

- **Vitest**, suite unique sous `tests/shared/` (~18 fichiers) qui couvre la logique pure
  de `shared/utils/`.
- Les ~108 routes de `server/api/` **ne sont pas testées** : toute modification côté API se
  vérifie par un appel réel (curl / navigateur), pas par le typecheck.
