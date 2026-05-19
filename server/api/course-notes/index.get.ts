import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'

const include = {
  assignment: {
    include: {
      student: { select: { id: true, firstName: true, lastName: true, email: true } },
      course: { select: { id: true, title: true } }
    }
  }
} as const

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  if (user.role === Role.Tutor) {
    return prisma.courseNote.findMany({
      where: {
        assignment: {
          student: { tutors: { some: { tutorId: user.id } } }
        }
      },
      orderBy: { sessionDate: 'desc' },
      include
    })
  }

  return prisma.courseNote.findMany({
    where: { assignment: { studentId: user.id } },
    orderBy: { sessionDate: 'desc' },
    include
  })
})
