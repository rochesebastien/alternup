import { Role } from '@prisma/client'
import type { User } from '#auth-utils'
import { prisma } from '~/server/utils/prisma'
import { isTutorOf } from '~/server/utils/network'
import { timeFromMinutes } from '~/shared/utils/presence-entries'
import type { PresenceEntry } from '~/shared/utils/presence-entries'

type PresenceEntryRow = {
  id: string
  studentId: string
  date: Date
  startMinute: number
  endMinute: number
  note: string | null
  recordedById: string
  recordedBy?: { id: string; firstName: string; lastName: string }
  student?: { id: string; firstName: string; lastName: string }
}

/**
 * Une colonne `@db.Date` est renvoyée par Prisma comme un `Date` à minuit UTC :
 * on la re-sérialise telle quelle en `AAAA-MM-JJ`, sans repasser par le fuseau
 * local (qui ferait reculer le jour d'un cran à l'ouest de Greenwich).
 */
export function dateKeyOf(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Inverse de `dateKeyOf` : `AAAA-MM-JJ` → minuit UTC du jour. */
export function dateFromKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`)
}

export function toPresenceEntry(row: PresenceEntryRow): PresenceEntry {
  return {
    id: row.id,
    studentId: row.studentId,
    date: dateKeyOf(row.date),
    startTime: timeFromMinutes(row.startMinute),
    endTime: timeFromMinutes(row.endMinute),
    minutes: row.endMinute - row.startMinute,
    note: row.note,
    // Pointage saisi par le tuteur : on le signale côté UI.
    recordedBy: row.recordedById === row.studentId ? null : row.recordedBy ?? null,
    student: row.student
  }
}

/**
 * Qui peut pointer pour qui : soi-même, ou son tuteur. Toute autre combinaison
 * est traitée comme une ressource inexistante (pas d'énumération des comptes).
 */
export async function assertCanRecordFor(studentId: string, user: User): Promise<void> {
  if (user.id === studentId) return
  if (user.role === Role.Tutor && (await isTutorOf(user.id, studentId))) return
  throw createError({ statusCode: 404, statusMessage: 'Personne introuvable dans votre réseau.' })
}

export const presenceEntryInclude = {
  recordedBy: { select: { id: true, firstName: true, lastName: true } },
  student: { select: { id: true, firstName: true, lastName: true } }
} as const

/** Charge un pointage que l'utilisateur a le droit de modifier / supprimer. */
export async function loadEditableEntry(id: string, user: User) {
  const entry = await prisma.presenceEntry.findUnique({
    where: { id },
    include: presenceEntryInclude
  })
  if (!entry) {
    throw createError({ statusCode: 404, statusMessage: 'Pointage introuvable.' })
  }
  await assertCanRecordFor(entry.studentId, user)
  return entry
}
