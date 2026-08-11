import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import {
  assertCanRecordFor,
  dateFromKey,
  presenceEntryInclude,
  toPresenceEntry
} from '~/server/utils/presence-entries'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { minutesFromTime, presenceEntryUpsertSchema } from '~/shared/utils/presence-entries'
import type { PresenceEntry } from '~/shared/utils/presence-entries'

/**
 * Pointage d'une journée. Re-pointer le même jour met à jour la ligne existante
 * (une seule journée déclarée par personne et par date).
 */
export default defineEventHandler(async (event): Promise<PresenceEntry> => {
  const user = await requireAuth(event)

  const parsed = presenceEntryUpsertSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données de pointage invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const { date, startTime, endTime, note } = parsed.data
  const studentId = parsed.data.studentId ?? user.id
  await assertCanRecordFor(studentId, user)

  const day = dateFromKey(date)
  const startMinute = minutesFromTime(startTime)
  const endMinute = minutesFromTime(endTime)

  const entry = await prisma.presenceEntry.upsert({
    where: { studentId_date: { studentId, date: day } },
    create: {
      studentId,
      date: day,
      startMinute,
      endMinute,
      note: note ?? null,
      recordedById: user.id
    },
    update: {
      startMinute,
      endMinute,
      note: note ?? null,
      recordedById: user.id
    },
    include: presenceEntryInclude
  })

  return toPresenceEntry(entry)
})
