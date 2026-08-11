import { z } from 'zod'

/**
 * Pointage journalier : « je suis là aujourd'hui, arrivé à 9h00, reparti à
 * 17h30 ». Les horaires circulent en `HH:MM` (heure de pendule déclarée) et
 * sont stockés en minutes depuis minuit — aucune conversion de fuseau ne doit
 * pouvoir décaler une heure d'arrivée.
 */
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export const MINUTES_IN_DAY = 24 * 60

/** Durée proposée par défaut entre l'arrivée et le départ (journée type). */
export const WORKDAY_MINUTES = 8 * 60

const timeString = z
  .string({ error: 'Une heure est requise.' })
  .trim()
  .regex(TIME_PATTERN, 'Heure invalide (format attendu : HH:MM).')

const dateString = z
  .string({ error: 'La date est requise.' })
  .trim()
  .regex(DATE_PATTERN, 'Date invalide (format attendu : AAAA-MM-JJ).')

const dayFields = {
  date: dateString,
  startTime: timeString,
  endTime: timeString,
  note: z.string().trim().max(500, '500 caractères maximum.').nullable().optional()
}

const END_AFTER_START = {
  message: "L'heure de départ doit être postérieure à l'heure d'arrivée.",
  path: ['endTime'] as const
}

function endAfterStart(d: { startTime: string, endTime: string }): boolean {
  return minutesFromTime(d.endTime) > minutesFromTime(d.startTime)
}

/** Formulaire « je pointe ma journée » (l'auteur pointe pour lui-même). */
export const presenceEntryDaySchema = z.object(dayFields).refine(endAfterStart, END_AFTER_START)

/**
 * Corps accepté par l'API. `studentId` absent = pointage pour soi-même ; un
 * tuteur peut viser un apprenant de son réseau, jamais l'inverse (contrôlé
 * côté serveur).
 */
export const presenceEntryUpsertSchema = z
  .object({ ...dayFields, studentId: z.guid().optional() })
  .refine(endAfterStart, END_AFTER_START)

/** Formulaire du tuteur : la personne pointée est obligatoire. */
export const presenceEntryTutorFormSchema = z
  .object({ ...dayFields, studentId: z.guid({ error: 'Sélectionnez une personne.' }) })
  .refine(endAfterStart, END_AFTER_START)

export const presenceEntryListQuerySchema = z.object({
  studentId: z.guid().optional(),
  from: dateString.optional(),
  to: dateString.optional()
})

export type PresenceEntryDayInput = z.input<typeof presenceEntryDaySchema>
export type PresenceEntryUpsertInput = z.input<typeof presenceEntryUpsertSchema>
export type PresenceEntryListQuery = z.input<typeof presenceEntryListQuerySchema>

/** Pointage tel qu'exposé par l'API. */
export interface PresenceEntry {
  id: string
  studentId: string
  /** Jour pointé, au format `AAAA-MM-JJ`. */
  date: string
  startTime: string
  endTime: string
  /** Durée de la journée, en minutes. */
  minutes: number
  note: string | null
  /** Renseigné quand le pointage a été saisi par quelqu'un d'autre (le tuteur). */
  recordedBy: { id: string; firstName: string; lastName: string } | null
  student?: { id: string; firstName: string; lastName: string }
}

/** `"09:05"` → `545`. La chaîne est supposée déjà validée par le schéma. */
export function minutesFromTime(value: string): number {
  const match = TIME_PATTERN.exec(value.trim())
  if (!match) return 0
  return Number(match[1]) * 60 + Number(match[2])
}

/** `545` → `"09:05"`. */
export function timeFromMinutes(value: number): string {
  const clamped = Math.max(0, Math.min(MINUTES_IN_DAY - 1, Math.round(value)))
  const hours = Math.floor(clamped / 60)
  return `${String(hours).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`
}

/** `455` → `"7h35"`, `480` → `"8h"`, `0` → `"0h"`. */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const hours = Math.floor(total / 60)
  const rest = total % 60
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, '0')}`
}

/** Jour local au format `AAAA-MM-JJ` (jamais `toISOString`, qui repasse en UTC). */
export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Heure courante arrondie au quart d'heure inférieur, pour pré-remplir un formulaire. */
export function roundedNowTime(date: Date, step = 15): string {
  const minutes = date.getHours() * 60 + date.getMinutes()
  return timeFromMinutes(Math.floor(minutes / step) * step)
}

/** Lundi de la semaine du jour donné, au format `AAAA-MM-JJ`. */
export function startOfWeekKey(date: Date): string {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  // getDay() : 0 = dimanche. On veut un début de semaine au lundi.
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return toDateKey(monday)
}

/** Total des minutes pointées sur les entrées fournies. */
export function totalMinutes(entries: Array<{ minutes: number }>): number {
  return entries.reduce((sum, entry) => sum + entry.minutes, 0)
}
