import { Prisma, Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { loadProjectOwnedBy } from '~/server/utils/projects'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { assignmentCreateSchema } from '~/shared/utils/projects'

const include = {
  project: { select: { id: true, title: true, internal: true } },
  student: { select: { id: true, firstName: true, lastName: true, email: true } }
} as const

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Tutor)

  const parsed = assignmentCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données d\'affectation invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  await loadProjectOwnedBy(parsed.data.projectId, user)

  const student = await prisma.user.findUnique({
    where: { id: parsed.data.studentId },
    select: { id: true, role: true }
  })
  if (!student) {
    throw createError({ statusCode: 400, statusMessage: 'Utilisateur introuvable.' })
  }
  if (student.role !== Role.Alternant && student.role !== Role.Stagiaire) {
    throw createError({
      statusCode: 400,
      statusMessage: "Cet utilisateur n'est ni alternant ni stagiaire."
    })
  }

  try {
    return await prisma.projectAssignment.create({
      data: parsed.data,
      include
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Cette mission est déjà attribuée à cette personne.'
      })
    }
    throw err
  }
})
