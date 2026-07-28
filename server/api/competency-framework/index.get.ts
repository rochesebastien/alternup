import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Tutor)

  const domains = await prisma.competencyDomain.findMany({
    where: { tutorId: user.id },
    orderBy: { position: 'asc' },
    include: { competencies: { orderBy: { position: 'asc' } } }
  })

  return domains.map((d) => ({
    id: d.id,
    label: d.label,
    competencies: d.competencies.map((c) => ({ id: c.id, label: c.label }))
  }))
})
