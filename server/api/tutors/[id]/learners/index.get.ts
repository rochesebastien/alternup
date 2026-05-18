import { prisma } from '~/server/utils/prisma'
import { requireSelfTutor } from '~/server/utils/require-self-tutor'

export default defineEventHandler(async (event) => {
  const tutor = await requireSelfTutor(event)

  const relations = await prisma.tutorStudent.findMany({
    where: { tutorId: tutor.id },
    orderBy: { addedAt: 'desc' },
    include: {
      student: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true
        }
      }
    }
  })

  return relations.map((r) => ({ ...r.student, addedAt: r.addedAt }))
})
