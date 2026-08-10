/**
 * Changelog de l'application, affiché dans la dialog « Nouveautés » (nav).
 * Entrées triées de la plus récente à la plus ancienne — ajouter les nouvelles
 * versions en tête de liste.
 */
export interface ChangelogEntry {
  /** Date de publication au format ISO (AAAA-MM-JJ). */
  date: string
  title: string
  items: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-08-10',
    title: 'Calendrier plus flexible et nouvelle page de connexion',
    items: [
      'Un événement peut être créé sans alternant ni stagiaire, et la présence obligatoire peut être précisée.',
      'Le calendrier s\'ajuste désormais à la hauteur de l\'écran.',
      'Nouvelle page de connexion / inscription.',
      'Menu « Mon compte » dans la barre de navigation, avec la déconnexion.',
      'Vues de l\'application centrées avec des marges latérales.',
      'Navigation : survol jaune et page active mise en évidence.',
      'Cette fenêtre de nouveautés.'
    ]
  },
  {
    date: '2026-08-02',
    title: 'Calendrier interactif',
    items: [
      'Nouveau calendrier (vues mois, semaine, jour et liste) avec glisser-déposer des événements.',
      'Refonte visuelle de la page d\'accueil.'
    ]
  },
  {
    date: '2026-07-28',
    title: 'Suivi renforcé',
    items: [
      'Centre de notifications et relances automatiques.',
      'Alertes de décrochage avec score de risque par alternant.',
      'Signature tripartite horodatée des documents et export PDF.',
      'Vue 360° de l\'alternant pour préparer les entretiens.'
    ]
  },
  {
    date: '2026-07-22',
    title: 'Modules de suivi pédagogique',
    items: [
      'Présences, rapports d\'étape, bulletins, visites en entreprise.',
      'Référentiel de compétences et messagerie tuteur-alternant.'
    ]
  }
]
