import { minutesFromTime, presenceKindShortLabel, type PresenceEntry } from '~/shared/utils/presence-entries'

export interface ApiCalendarEvent {
  id: string
  studentId: string | null
  tutorId: string
  title: string
  startTime: string
  endTime: string
  courseAssignmentId: string | null
  presenceRequired: boolean
  student?: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
  courseAssignment?: {
    id: string
    course: { id: string; title: string }
  } | null
}

/**
 * Catégories d'affichage du calendrier. Chaque catégorie correspond à un jeu
 * de classes de couleur (`components/calendar/category-classes.ts`, clair /
 * sombre). `presence` couvre les pointages journaliers (lecture seule dans
 * le calendrier).
 */
export type CalendarCategoryId = 'session' | 'visite' | 'autre' | 'presence'

/**
 * `TRaw` par défaut à l'union des deux sources possibles pour les usages
 * génériques (ex. le flux fusionné consommé par les vues du calendrier) ;
 * `toDisplayEvent` et `presenceToDisplayEvent` le fixent chacun à leur propre
 * type pour que `rawEvent` reste précisément typé côté appelant.
 */
export interface CalendarDisplayEvent<TRaw = ApiCalendarEvent | PresenceEntry> {
  id: string
  title: string
  /** Chaîne ISO 8601 telle que renvoyée par l'API (pas de conversion ici). */
  start: string
  /** Chaîne ISO 8601 telle que renvoyée par l'API (pas de conversion ici). */
  end: string
  calendarId: CalendarCategoryId
  /** Événement de calendrier « libre », ou pointage journalier pour la catégorie `presence`. */
  rawEvent: TRaw
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
 * Volontairement pur et sans dépendance au moteur de rendu : les vues du
 * calendrier (`components/calendar/`) travaillent en `Date` natives et
 * `date-fns`, construites à partir des chaînes ISO ci-dessous.
 */
export function toDisplayEvent(event: ApiCalendarEvent): CalendarDisplayEvent<ApiCalendarEvent> {
  return {
    id: event.id,
    title: toDisplayTitle(event),
    start: event.startTime,
    end: event.endTime,
    calendarId: toCalendarCategory(event),
    rawEvent: event
  }
}

export function toDisplayEvents(events: ApiCalendarEvent[]): CalendarDisplayEvent<ApiCalendarEvent>[] {
  return events.map(toDisplayEvent)
}

/**
 * `date` ('AAAA-MM-JJ') + `time` ('HH:MM') → chaîne ISO en heure LOCALE.
 * Volontairement construit à partir des composants (`new Date(an, mois, jour, h, min)`)
 * et non par concaténation de chaînes : ni `date` ni `time` ne portent de fuseau, la
 * seule lecture correcte est « heure de pendule locale », jamais UTC. Les chaînes sont
 * déjà validées en amont (schémas Zod) : les composants sont donc toujours des nombres.
 */
function localIsoFromDateAndTime(date: string, time: string): string {
  const parts = date.split('-').map(Number)
  const year = parts[0] ?? 0
  const month = parts[1] ?? 1
  const day = parts[2] ?? 1
  const minutes = minutesFromTime(time)
  return new Date(year, month - 1, day, Math.floor(minutes / 60), minutes % 60).toISOString()
}

/**
 * Préfixe le titre par le prénom de la personne quand le pointage n'est pas
 * celui du visiteur courant (vue tuteur, qui voit les pointages de son réseau).
 */
function presenceTitle(entry: PresenceEntry, viewerId: string): string {
  const shortLabel = presenceKindShortLabel(entry.kind)
  if (entry.studentId === viewerId || !entry.student) return shortLabel
  return `${entry.student.firstName} · ${shortLabel}`
}

/**
 * Projette un pointage journalier vers le format d'affichage du calendrier.
 * Fonction pure, au même titre que `toDisplayEvent`. L'identifiant est
 * préfixé pour ne jamais entrer en collision avec un `ApiCalendarEvent` et
 * pour reconnaître la catégorie sans relire `calendarId`.
 */
export function presenceToDisplayEvent(entry: PresenceEntry, viewerId: string): CalendarDisplayEvent<PresenceEntry> {
  return {
    id: `presence-${entry.id}`,
    title: presenceTitle(entry, viewerId),
    start: localIsoFromDateAndTime(entry.date, entry.startTime),
    end: localIsoFromDateAndTime(entry.date, entry.endTime),
    calendarId: 'presence',
    rawEvent: entry
  }
}

export function presenceEntriesToDisplayEvents(
  entries: PresenceEntry[],
  viewerId: string
): CalendarDisplayEvent<PresenceEntry>[] {
  return entries.map((entry) => presenceToDisplayEvent(entry, viewerId))
}
