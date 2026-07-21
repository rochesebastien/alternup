import { Role, ReportStatus } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'

const studentInclude = {
  student: { select: { id: true, firstName: true, lastName: true, email: true } }
} as const

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  if (user.role === Role.Tutor) {
    const query = getQuery(event)
    const statusRaw = typeof query.status === 'string' ? query.status : undefined
    const status =
      statusRaw && statusRaw in ReportStatus
        ? (statusRaw as ReportStatus)
        : undefined

    return prisma.progressReport.findMany({
      where: { tutorId: user.id, ...(status ? { status } : {}) },
      orderBy: [{ status: 'asc' }, { periodEnd: 'desc' }],
      include: studentInclude
    })
  }

  return prisma.progressReport.findMany({
    where: { studentId: user.id },
    orderBy: { periodEnd: 'desc' }
  })
})
