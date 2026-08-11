import { Role } from '@prisma/client'
import type { User } from '#auth-utils'
import { prisma } from '~/server/utils/prisma'
import { isTutorOf } from '~/server/utils/network'
import { timeFromMinutes } from '~/shared/utils/presence-entries'
import type { PresenceEntry, PresenceEntryRevision, PresenceKind } from '~/shared/utils/presence-entries'

type PresenceEntryRow = {
  id: string
  studentId: string
  date: Date
  startMinute: number
  endMinute: number
  kind: PresenceKind
  recordedById: string
  recordedBy?: { id: string; firstName: string; lastName: string }
  student?: { id: string; firstName: string; lastName: string }
  /** Compte des révisions, chargé via `_count.revisions` (voir `presenceEntryInclude`). */
  _count?: { revisions: number }
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

/**
 * `currentUserId` détermine le verrouillage : un apprenant ne peut plus
 * modifier son propre pointage une fois créé (anti-triche), son tuteur si.
 */
export function toPresenceEntry(row: PresenceEntryRow, currentUserId: string): PresenceEntry {
  return {
    id: row.id,
    studentId: row.studentId,
    date: dateKeyOf(row.date),
    startTime: timeFromMinutes(row.startMinute),
    endTime: timeFromMinutes(row.endMinute),
    minutes: row.endMinute - row.startMinute,
    kind: row.kind,
    // Pointage saisi par le tuteur : on le signale côté UI.
    recordedBy: row.recordedById === row.studentId ? null : row.recordedBy ?? null,
    student: row.student,
    revisionCount: row._count?.revisions ?? 0,
    locked: currentUserId === row.studentId
  }
}

export function toPresenceEntryRevision(row: {
  id: string
  action: 'created' | 'updated'
  startMinute: number
  endMinute: number
  kind: PresenceKind
  changedAt: Date
  changedBy: { id: string; firstName: string; lastName: string }
}): PresenceEntryRevision {
  return {
    id: row.id,
    action: row.action,
    startTime: timeFromMinutes(row.startMinute),
    endTime: timeFromMinutes(row.endMinute),
    kind: row.kind,
    changedAt: row.changedAt.toISOString(),
    changedBy: row.changedBy
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
  student: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { revisions: true } }
} as const

/**
 * Charge un pointage rattaché à un apprenant sous la responsabilité de ce
 * tuteur ; 404 sinon (pas d'énumération des comptes hors réseau). Réservé aux
 * routes tuteur (suppression, historique) — le contrôle de rôle se fait en
 * amont, dans le handler, pour renvoyer le message d'erreur adapté.
 */
export async function loadEntryOwnedByTutor(id: string, tutorId: string) {
  const entry = await prisma.presenceEntry.findUnique({
    where: { id },
    include: presenceEntryInclude
  })
  // `studentId === tutorId` : pointage historique saisi par un tuteur pour
  // lui-même (désormais refusé à l'écriture) — il doit rester supprimable.
  const owned = entry
    && (entry.studentId === tutorId || (await isTutorOf(tutorId, entry.studentId)))
  if (!entry || !owned) {
    throw createError({ statusCode: 404, statusMessage: 'Pointage introuvable.' })
  }
  return entry
}
