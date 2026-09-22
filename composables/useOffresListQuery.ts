/**
 * Dernière requête (filtres, page) du tableau des offres, mémorisée à
 * l'ouverture d'une offre : le fil d'Ariane de la page détail ramène au
 * tableau tel qu'on l'a quitté. `useState` : partagé entre pages, sans
 * persistance (un accès direct à la page détail ramène au tableau par défaut).
 */
export function useOffresListQuery() {
  return useState<Record<string, string>>('offres-list-query', () => ({}))
}
