import { differenceInMinutes, startOfDay } from 'date-fns'
import { dayKey } from './calendar-dates'

export const HOUR_HEIGHT = 56
export const PX_PER_MINUTE = HOUR_HEIGHT / 60
export const SNAP_MINUTES = 15
// Hauteur peinte minimale, pas un plancher de durée : un événement de 15 min
// (le pas de redimensionnement est le vrai minimum) se dessine quand même à
// cette hauteur pour rester lisible.
export const MIN_EVENT_MINUTES = 30
export const DAY_MINUTES = 24 * 60
// Distance de pointeur avant qu'un geste compte comme un glissé plutôt qu'un
// clic, partagée par le déplacement/redimensionnement et le glissé de création.
export const DRAG_THRESHOLD = 5
// Identifiant porté par le fantôme de création à travers la mise en page, pour
// que la vue distingue l'événement en cours de dessin d'un événement réel.
export const DRAFT_EVENT_ID = 'draft'

/** Ce que `layoutDay` et `bucketByDay` attendent d'un événement : des bornes ISO. */
export interface LayoutEvent {
  id: string
  start: string
  end: string
}

export interface PositionedEvent<T extends LayoutEvent = LayoutEvent> {
  event: T
  /** px */
  top: number
  /** px */
  height: number
  /** % */
  left: number
  /** % */
  width: number
}

/**
 * Cluster + répartition en colonnes, la méthode de Google Calendar : les
 * événements qui se chevauchent transitivement forment un cluster, chaque
 * cluster se divise dans le nombre minimal de colonnes.
 */
export function layoutDay<T extends LayoutEvent>(events: T[], day: Date): PositionedEvent<T>[] {
  const dayStart = startOfDay(day)

  const items = events
    .map((event) => {
      const startMin = Math.max(0, differenceInMinutes(new Date(event.start), dayStart))
      const endMin = Math.min(DAY_MINUTES, differenceInMinutes(new Date(event.end), dayStart))
      return { event, startMin, endMin }
    })
    .filter(item => item.endMin > item.startMin)
    // Les événements plus courts que le minimum sont peints au-delà de leur
    // fin réelle, la répartition tourne donc sur ce qui est peint, sinon ils
    // se chevaucheraient visuellement.
    .map(item => ({ ...item, endMin: Math.max(item.endMin, item.startMin + MIN_EVENT_MINUTES) }))
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin)

  const positioned: PositionedEvent<T>[] = []

  let cluster: typeof items = []
  let clusterEnd = -Infinity

  function flush() {
    const columns: number[] = []
    const assigned = cluster.map((item) => {
      let index = columns.findIndex(end => end <= item.startMin)
      if (index === -1) index = columns.length
      columns[index] = item.endMin
      return index
    })

    for (const [index, item] of cluster.entries()) {
      positioned.push({
        event: item.event,
        top: item.startMin * PX_PER_MINUTE,
        height: (item.endMin - item.startMin) * PX_PER_MINUTE,
        left: (assigned[index]! / columns.length) * 100,
        width: 100 / columns.length
      })
    }
  }

  for (const item of items) {
    if (cluster.length && item.startMin >= clusterEnd) {
      flush()
      cluster = []
      clusterEnd = -Infinity
    }
    cluster.push(item)
    clusterEnd = Math.max(clusterEnd, item.endMin)
  }

  if (cluster.length) flush()

  return positioned
}

/**
 * Répartit les événements par jour couvert (clé `dayKey`). Un événement à
 * cheval sur minuit apparaît dans chaque jour qu'il couvre, sur l'intervalle
 * demi-ouvert `[start, end)` : une fin pile à minuit n'ajoute pas le jour
 * suivant.
 */
export function bucketByDay<T extends LayoutEvent>(events: T[]): Map<string, T[]> {
  const buckets = new Map<string, T[]>()

  for (const event of events) {
    const start = new Date(event.start)
    const end = new Date(event.end)
    if (!(end > start)) continue

    let cursor = startOfDay(start)
    const lastDay = startOfDay(new Date(end.getTime() - 1))

    while (cursor <= lastDay) {
      const key = dayKey(cursor)
      const bucket = buckets.get(key)
      if (bucket) bucket.push(event)
      else buckets.set(key, [event])
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
    }
  }

  return buckets
}

export function snapMinutes(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES
}

/**
 * Minute du jour sous le pointeur dans une colonne, arrondie et bornée au
 * jour. `'floor'` cale sur le créneau où le pointeur se trouve (clic),
 * `'nearest'` arrondit au bord le plus proche (glissé).
 */
export function minutesInColumn(clientY: number, rectTop: number, mode: 'floor' | 'nearest' = 'nearest'): number {
  const raw = (clientY - rectTop) / PX_PER_MINUTE
  const snapped = mode === 'floor' ? Math.floor(raw / SNAP_MINUTES) * SNAP_MINUTES : snapMinutes(raw)
  return Math.min(DAY_MINUTES, Math.max(0, snapped))
}

/**
 * Géométrie CSS partagée par un bloc d'événement et le fantôme de création ;
 * le bloc ajoute par-dessus sa propre transformation de glissé.
 */
export function eventBlockStyle(positioned: PositionedEvent, height = positioned.height): Record<string, string> {
  return {
    // Dégage les lignes d'heure qu'il touche en haut et en bas d'un pixel,
    // le même espace qu'il laisse sur ses deux bords latéraux, pour que la
    // grille reste visible entre les blocs.
    top: `${positioned.top + 2}px`,
    height: `${height - 3}px`,
    insetInlineStart: `calc(${positioned.left}% + 1px)`,
    width: `calc(${positioned.width}% - 2px)`
  }
}
