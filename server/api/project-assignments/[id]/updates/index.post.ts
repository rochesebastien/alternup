import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { loadAssignmentVisibleTo } from '~/server/utils/projects'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { projectUpdateCreateSchema } from '~/shared/utils/project-updates'

const uuid = z.string().uuid()

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = uuid.safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: "Identifiant d'affectation invalide." })
  }

  // 404 si l'utilisateur n'est ni le tuteur propriétaire ni l'étudiant de la mission.
  await loadAssignmentVisibleTo(id.data, user)

  const parsed = projectUpdateCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Retour invalide.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const { body, status } = parsed.data

  // Le retour est ajouté au journal (append-only). Si un statut est fourni,
  // on met aussi à jour le statut courant de la mission, dans la même transaction.
  const [update] = await prisma.$transaction([
    prisma.projectUpdate.create({
      data: {
        assignmentId: id.data,
        authorId: user.id,
        body,
        status: status ?? null
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } }
      }
    }),
    ...(status
      ? [prisma.projectAssignment.update({ where: { id: id.data }, data: { status } })]
      : [])
  ])

  return update
})
