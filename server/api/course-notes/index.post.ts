import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { assertCanReadAssignment, notionsToPrismaInput } from '~/server/utils/courses'
import { formatZodIssues } from '~/shared/utils/auth-credentials'

const bodySchema = z.object({
  assignmentId: z.string().uuid(),
  sessionDate: z.coerce.date(),
  grade: z.coerce.number().min(0).max(20).nullable().optional(),
  comment: z.string().trim().max(5000).nullable().optional(),
  notionsCovered: z.array(z.string().trim().min(1)).nullable().optional()
})

const include = {
  assignment: {
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      course: { select: { id: true, title: true } }
    }
  }
} as const

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid note payload',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const assignment = await prisma.courseAssignment.findUnique({
    where: { id: parsed.data.assignmentId },
    select: { studentId: true }
  })
  if (!assignment) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid assignmentId' })
  }
  await assertCanReadAssignment(user, assignment.studentId)

  return prisma.courseNote.create({
    data: {
      assignmentId: parsed.data.assignmentId,
      sessionDate: parsed.data.sessionDate,
      grade: parsed.data.grade ?? null,
      comment: parsed.data.comment ?? null,
      notionsCovered: notionsToPrismaInput(parsed.data.notionsCovered)
    },
    include
  })
})
