import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { learnerIdsOf } from '~/server/utils/network'
import {
  assertCanRecordFor,
  dateFromKey,
  presenceEntryInclude,
  toPresenceEntry
} from '~/server/utils/presence-entries'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { presenceEntryListQuerySchema } from '~/shared/utils/presence-entries'
import type { PresenceEntry } from '~/shared/utils/presence-entries'

/**
 * Journal des pointages. Un apprenant ne voit que les siens ; un tuteur voit
 * ceux d'un apprenant précis (`studentId`) ou, par défaut, de tout son réseau.
 */
export default defineEventHandler(async (event): Promise<PresenceEntry[]> => {
  const user = await requireAuth(event)

  const parsed = presenceEntryListQuerySchema.safeParse(getQuery(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Filtres invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }
  const { studentId, from, to } = parsed.data

  let studentFilter: string | { in: string[] }
  if (studentId) {
    await assertCanRecordFor(studentId, user)
    studentFilter = studentId
  } else if (user.role === Role.Tutor) {
    studentFilter = { in: await learnerIdsOf(user.id) }
  } else {
    studentFilter = user.id
  }

  const entries = await prisma.presenceEntry.findMany({
    where: {
      studentId: studentFilter,
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: dateFromKey(from) } : {}),
              ...(to ? { lte: dateFromKey(to) } : {})
            }
          }
        : {})
    },
    orderBy: { date: 'desc' },
    include: presenceEntryInclude
  })

  return entries.map(toPresenceEntry)
})
