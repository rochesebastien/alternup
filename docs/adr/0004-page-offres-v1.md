# ADR-0004 — Page « Offres » v1 (espace alternant)

Statut : proposé (2026-08-29)

## Contexte

Décisions de gate : la page offres v1 vit **derrière auth dans l'espace alternant**
(rôles Alternant **et** Stagiaire) ; une version publique/SEO est **explicitement hors
périmètre**. Le stock d'offres (ADR-0002) peut atteindre des centaines de milliers de
lignes : le tableau doit être **server-side** (filtres + pagination en SQL). Le dépôt n'a
quasi aucun pattern de pagination (un seul cas `skip` + `take` fixe sur
`/api/notifications` — rapport `docs/plans/discovery/b-conventions.md` §3) : il faut en
introduire un. Les CGU LBA (rapport D) imposent la gratuité, un usage non lucratif et
recommandent la mention de source + le lien de candidature `apply.url`.

## Décision

### Route, accès, navigation

- Page : `pages/alternant/offres/index.vue` → `/alternant/offres`, protégée par la garde
  de préfixe de l'ADR-0001 (Alternant + Stagiaire ; un tuteur y reçoit `/forbidden`).
  Pas de page de détail en v1 : la ligne du tableau suffit (titre, entreprise, lieu,
  contrat, date), le détail complet est chez la source via le lien sortant.
- Entrée de nav dans `layouts/alternant.vue` (« Offres », icône `i-lucide-briefcase`).
- API : `server/api/offres/index.get.ts` (liste filtrée/paginée, `requireRole(event,
  Role.Alternant, Role.Stagiaire)`) et `server/api/offres/[id]/statut.post.ts` (action de
  statut — POST verbal conformément aux conventions du dépôt).

### Pagination : nouveau pattern `page`/`limit` avec enveloppe

Le pattern `skip` de notifications (« charger plus », pas de total) ne convient pas à un
tableau filtrable. On introduit, dans `shared/utils/offres.ts` :

```ts
export const OFFRE_PAGE_SIZE = 25
export const offreListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(OFFRE_PAGE_SIZE),
  typeContrat: z.enum(OffreContratType).optional(),
  lieu: z.string().trim().max(120).optional(),      // contains insensible sur Offre.lieu
  q: z.string().trim().max(120).optional(),         // contains insensible titre + entreprise
  statut: z.enum(CandidatureStatut).optional(),     // filtre sur MON statut de candidature
  inclureExpirees: z.coerce.boolean().default(false)
})
```

Réponse : `{ items, total, page, limit }` — dérogation assumée à la règle « pas
d'enveloppe » (le `total` est indispensable à `UPagination`), documentée ici pour servir
de précédent aux futures listes paginées. Erreur 400 « Filtres invalides. » +
`data.issues` via `formatZodIssues`, squelette de handler standard (safeParse sur
`getQuery(event)`, singleton `~/server/utils/prisma`). Le `where` joint
`OffreUserStatut` **filtré sur `user.id` de session** pour le filtre `statut` et pour
renvoyer `monStatut` par ligne. Par défaut, seules les offres `statut: active` sont
listées (`inclureExpirees` les réaffiche, marquées — cohérent avec l'exigence de
fraîcheur : on n'expose pas d'offres mortes par défaut, ADR-0002).

Côté page : `useFetch('/api/offres', { query })` avec une query réactive (les filtres
sont des `ref` reflétés dans l'URL via `router.replace` pour rendre la recherche
partageable), `UTable` server-side (`:data="data.items"`, `:loading`) + `UPagination`
(`:total`, `v-model:page`). Gabarit : `pages/alternants/index.vue` (rapport B §5), en
retirant la partie filtrage client.

### Colonnes, badge « nouveau », actions

- Colonnes : Titre (+ badge), Entreprise, Lieu, Contrat (`UBadge` apprentissage /
  professionnalisation), Publiée le (`datePublication`, sinon `firstSeen`), Statut (mon
  suivi), Lien.
- **Badge « nouveau »** : `firstSeen` dans les `OFFRE_NOUVEAUTE_JOURS` derniers jours
  (constante partagée, valeur initiale **7**) **et** aucune ligne `OffreUserStatut` de
  l'utilisateur — calculé par une fonction pure `estNouvelle(offre, monStatut, now)` dans
  `shared/utils/offres.ts` (testée dans `tests/shared/offres.test.ts`). Pas d'état « vu »
  implicite au scroll : simple et sans écriture massive.
- **Actions de statut** (menu par ligne) : « Marquer vue », « J'ai candidaté »,
  « Rejeter » → `$fetch` POST `/api/offres/[id]/statut` body `{ statut }` (validé par
  `offreStatutInputSchema`, upsert sur la PK `[userId, offreId]` — ADR-0002), puis
  `refresh()` + toast, conformément au pattern mutation du dépôt. Revenir en arrière =
  reposer un autre statut (pas de suppression en v1).

### Lien sortant et conformité CGU LBA

- Chaque ligne porte un `UButton`/lien **« Voir l'offre »** vers `Offre.url`
  (`apply.url` LBA), `target="_blank"` + `rel="noopener noreferrer nofollow"` — la
  candidature se fait **chez la source**, Alternup ne réplique pas le formulaire.
- **Attribution** : encart permanent sous le tableau —
  « Offres fournies par [La bonne alternance](https://labonnealternance.apprentissage.beta.gouv.fr)
  (API Apprentissage — Mission interministérielle pour l'apprentissage), mises à jour
  quotidiennement. Dernière synchronisation : {date du dernier `ScrapeRun` en `succes`} »
  (date renvoyée par `index.get.ts` dans l'enveloppe, champ `lastSync`). Satisfait la
  mention de paternité Etalab 2.0 relevée au rapport D.
- **Usage non lucratif** : l'accès aux offres reste gratuit pour les apprenants (aucune
  fonctionnalité payante ne doit conditionner cette page) ; contrainte consignée ici —
  si le modèle économique d'Alternup change, re-valider avec l'équipe LBA avant release
  (rapport D, § CGU).
- Anti-extraction de bon sens : pagination bornée (`limit ≤ 100`), pas d'endpoint
  d'export, page derrière auth.

### Hors périmètre v1 (explicite)

Version publique/SEO de la liste, page de détail interne, alertes/notifications de
nouvelles offres, recommandations par profil, accès tuteur aux offres, offres de stage.

## Conséquences

- Nouveaux fichiers : `pages/alternant/offres/index.vue`,
  `server/api/offres/index.get.ts`, `server/api/offres/[id]/statut.post.ts`,
  schémas/constantes/fonctions dans `shared/utils/offres.ts` (+ tests
  `tests/shared/offres.test.ts`), entrée de nav dans `layouts/alternant.vue`.
- Premier pattern paginé `page`/`limit` + enveloppe `{ items, total, page, limit }` du
  dépôt : les futures listes volumineuses s'y conformeront.
- Index Prisma requis déjà prévus par l'ADR-0002 (`[statut, datePublication]`,
  `[typeContrat]`) ; le filtre `lieu`/`q` en `contains` insensible est suffisant en v1
  (pas de full-text search Postgres tant que la volumétrie réelle ne l'exige pas).
- Vérification du lot : appels curl sur `/api/offres` (filtres, bornes de pagination,
  403 pour un tuteur) + rendu navigateur, conformément à la politique du dépôt.

## Alternatives écartées

- **Tableau client-side** (tout charger puis filtrer en JS, comme
  `pages/alternants/index.vue`) : intenable au-delà de quelques milliers d'offres.
- **Pattern `skip` façon notifications** : pas de total, pas de saut de page, inadapté à
  un tableau filtrable ; le conserver aurait figé un pattern insuffisant.
- **Curseur (keyset pagination)** : plus performant en profondeur, mais sans saut de page
  et plus complexe ; l'offset borné suffit largement à l'usage (une personne qui parcourt
  des offres filtrées).
- **Marquage « vue » automatique à l'affichage** : écritures massives et statut ambigu ;
  le badge « nouveau » calculé + action explicite est plus honnête.
- **Page publique SEO** : décision de gate — hors périmètre v1.
