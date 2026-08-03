/**
 * Compteur d'éléments à traiter dans le centre de notifications
 * (notifications non lues + relances en cours), partagé entre la cloche de la
 * nav et la page `/notifications`. Alimenté une fois au montage par la cloche,
 * puis mis à jour localement quand l'utilisateur marque des éléments comme lus :
 * aucun polling.
 */
export function useNotificationCountState() {
  return useState<number>('notifications-count', () => 0)
}
