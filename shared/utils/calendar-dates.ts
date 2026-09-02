import { addDays, addMonths, startOfDay, startOfMonth, startOfWeek } from 'date-fns'

/**
 * Vues disponibles du calendrier. Contrairement au template Nuxt UI source,
 * il n'y a pas de mode « journée entière » ni de virtualisation : la vue
 * `month` est toujours une grille fixe de 6 semaines.
 */
export type CalendarView = 'day' | 'week' | 'month'

/** Plage demi-ouverte : `end` est le premier instant exclu. */
export interface DateRange {
  start: Date
  end: Date
}

/** Lundi de la semaine locale contenant `date`, à minuit. */
export function startOfWeekMonday(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

/**
 * Plage [lundi, lundi+jours). `days = 7` donne la semaine lundi → dimanche,
 * `days = 1` donne le seul jour passé (utilisé par la vue `day`).
 */
export function weekRange(date: Date, days = 7): DateRange {
  const start = days === 7 ? startOfWeekMonday(date) : startOfDay(date)
  return { start, end: addDays(start, days) }
}

/**
 * Grille de 6 semaines (42 jours) commençant le lundi de la semaine du 1er
 * du mois de `date`. Toujours 42 jours : la hauteur de la grille ne varie
 * jamais d'un mois à l'autre.
 */
export function monthRange(date: Date): DateRange {
  const start = startOfWeekMonday(startOfMonth(date))
  return { start, end: addDays(start, 42) }
}

export function rangeFor(view: CalendarView, date: Date): DateRange {
  if (view === 'month') return monthRange(date)
  return weekRange(date, view === 'day' ? 1 : 7)
}

/** Chaque jour de la plage, `end` exclu. */
export function eachDay({ start, end }: DateRange): Date[] {
  const days: Date[] = []
  for (let day = start; day < end; day = addDays(day, 1)) {
    days.push(day)
  }
  return days
}

/** Déplace `date` d'un pas de vue : ±1 jour, ±7 jours ou ±1 mois. */
export function stepDate(view: CalendarView, date: Date, direction: -1 | 1): Date {
  if (view === 'month') return addMonths(date, direction)
  return addDays(date, view === 'day' ? direction : direction * 7)
}

/** Clé de jour locale stable ('AAAA-MM-JJ'), utilisée comme clé de bucket. */
export function dayKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const DAY_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** Inverse de `dayKey` : minuit local ce jour-là, `null` si la clé est invalide. */
export function parseDayKey(key: string): Date | null {
  const match = DAY_KEY_PATTERN.exec(key)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)

  // Rejette les dates hors calendrier (ex. '2026-02-30') que le constructeur
  // `Date` reporterait silencieusement sur le mois suivant.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }

  return date
}

export function isSameDayLocal(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// Construits une seule fois au niveau module : instancier un `Intl.DateTimeFormat`
// coûte bien plus cher que formater avec, et ces fonctions tournent pour chaque
// chip d'événement et chaque cellule de jour de chaque semaine affichée.
const timeFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const weekdayFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
const monthFormat = new Intl.DateTimeFormat('fr-FR', { month: 'long' })
const shortMonthFormat = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
const shortMonthYearFormat = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' })
const fullDateFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export function formatTime(date: Date): string {
  return timeFormat.format(date)
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export function formatWeekday(date: Date): string {
  return weekdayFormat.format(date)
}

export function formatMonth(date: Date): string {
  return monthFormat.format(date)
}

export function formatShortMonth(date: Date): string {
  return shortMonthFormat.format(date)
}

export function formatFullDate(date: Date): string {
  return fullDateFormat.format(date)
}

export interface RangeTitle {
  months: string
  year: string
}

/**
 * Titre affiché au-dessus du calendrier. En vue mois, le mois de `date` ;
 * en semaine/jour, le ou les mois couverts par la plage (une semaine à
 * cheval sur deux mois donne « août – sept. », à cheval sur deux années
 * « déc. 2026 – janv. »). `year` est toujours l'année du dernier jour affiché.
 */
export function formatRangeTitle(view: CalendarView, date: Date): RangeTitle {
  if (view === 'month') {
    return { months: monthFormat.format(date), year: String(date.getFullYear()) }
  }

  const { start, end } = weekRange(date, view === 'day' ? 1 : 7)
  const last = addDays(end, -1)
  const year = String(last.getFullYear())

  if (start.getMonth() === last.getMonth() && start.getFullYear() === last.getFullYear()) {
    return { months: monthFormat.format(start), year }
  }

  const startMonth = (start.getFullYear() !== last.getFullYear() ? shortMonthYearFormat : shortMonthFormat).format(start)
  const endMonth = shortMonthFormat.format(last)

  return { months: `${startMonth} – ${endMonth}`, year }
}
