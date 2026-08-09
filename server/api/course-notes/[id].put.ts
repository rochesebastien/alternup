import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { loadCourseNoteVisibleTo, notionsToPrismaInput } from '~/server/utils/courses'
import { formatZodIssues } from '~/shared/utils/auth-credentials'

const uuid = z.string().uuid()

const bodySchema = z
  .object({
    grade: z.coerce.number().min(0).max(20).nullable().optional(),
    comment: z.string().trim().max(5000).nullable().optional(),
    notionsCovered: z.array(z.string().trim().min(1)).nullable().optional()
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'Au moins un champ doit être fourni.'
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
  const id = uuid.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant de note invalide.' })
  }

  await loadCourseNoteVisibleTo(id.data, user)

  const parsed = bodySchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données de note invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const data = {
    ...('grade' in parsed.data ? { grade: parsed.data.grade ?? null } : {}),
    ...('comment' in parsed.data ? { comment: parsed.data.comment ?? null } : {}),
    ...('notionsCovered' in parsed.data
      ? { notionsCovered: notionsToPrismaInput(parsed.data.notionsCovered) }
      : {})
  }

  return prisma.courseNote.update({ where: { id: id.data }, data, include })
})
