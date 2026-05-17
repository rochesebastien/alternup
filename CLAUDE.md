# CLAUDE.md

Ce fichier guide Claude Code (claude.ai/code) quand il travaille sur ce dépôt.

## Contexte projet

- **Alternup** : application Nuxt 3 monolithique pour le suivi d'alternants/stagiaires par leurs tuteurs.
- Stack cible : **Nuxt 3 + TypeScript + Tailwind + Prisma + PostgreSQL + nuxt-auth-utils**.
- Déploiement cible : **Dokploy** (Docker Compose, Postgres self-hosted).
- L'ancienne intégration Supabase est en cours de retrait — voir `taches/a-faire.md`.

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

## Commandes utiles

```bash
npm run dev          # Démarrer le serveur Nuxt (port 3000)
npm run build        # Build production
npm run start        # Démarrer le build
npm run lint         # ESLint
npm run lint:fix     # ESLint --fix
npm test             # Vitest
```
