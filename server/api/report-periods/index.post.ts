import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { periodCreateSchema } from '~/shared/utils/report-periods'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Tutor)

  const parsed = periodCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données de période invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const { label, startDate, endDate } = parsed.data

  return prisma.reportPeriod.create({
    data: {
      tutorId: user.id,
      label,
      startDate: new Date(startDate),
      endDate: new Date(endDate)
    }
  })
})
