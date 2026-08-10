export interface ApiCalendarEvent {
  id: string
  studentId: string
  tutorId: string
  title: string
  startTime: string
  endTime: string
  courseAssignmentId: string | null
  courseAssignment?: {
    id: string
    course: { id: string; title: string }
  } | null
}

/**
 * Catégories d'affichage du calendrier. Chaque catégorie correspond à un
 * « calendar » Schedule-X, c'est-à-dire à un jeu de couleurs (clair / sombre).
 */
export type CalendarCategoryId = 'session' | 'visite' | 'autre'

export interface CalendarDisplayEvent {
  id: string
  title: string
  /** Chaîne ISO 8601 telle que renvoyée par l'API (pas de conversion ici). */
  start: string
  /** Chaîne ISO 8601 telle que renvoyée par l'API (pas de conversion ici). */
  end: string
  calendarId: CalendarCategoryId
  rawEvent: ApiCalendarEvent
}

/**
 * Les visites de tuteur n'ont pas de type dédié en base : elles sont saisies
 * comme des événements libres dont le titre porte le mot « visite ».
 */
const VISIT_TITLE_PATTERN = /visite/i

export function toCalendarCategory(event: ApiCalendarEvent): CalendarCategoryId {
  if (event.courseAssignmentId != null) return 'session'
  return VISIT_TITLE_PATTERN.test(event.title) ? 'visite' : 'autre'
}

/** Une session de cours s'affiche sous le titre du cours, pas celui de l'événement. */
export function toDisplayTitle(event: ApiCalendarEvent): string {
  return event.courseAssignment?.course.title ?? event.title
}

/**
 * Projette un événement de l'API vers le format d'affichage du calendrier.
 *
 * Volontairement pur et sans dépendance au moteur de rendu : Schedule-X v4
 * attend des objets `Temporal`, mais leur construction dépend du global
 * `Temporal` (polyfill chargé côté navigateur uniquement). La conversion se
 * fait donc dans `pages/calendar.vue`, à partir des chaînes ISO ci-dessous.
 */
export function toDisplayEvent(event: ApiCalendarEvent): CalendarDisplayEvent {
  return {
    id: event.id,
    title: toDisplayTitle(event),
    start: event.startTime,
    end: event.endTime,
    calendarId: toCalendarCategory(event),
    rawEvent: event
  }
}

export function toDisplayEvents(events: ApiCalendarEvent[]): CalendarDisplayEvent[] {
  return events.map(toDisplayEvent)
}
