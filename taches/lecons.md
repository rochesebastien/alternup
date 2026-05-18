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
