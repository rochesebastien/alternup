import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { loadProfileVisibleTo, profileSelect } from '~/server/utils/profiles'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { profileUpdateSchema } from '~/shared/utils/profiles'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const id = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!id.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant de profil invalide.' })
  }

  // Soi-même, ou un membre du réseau du tuteur connecté. 404 sinon.
  await loadProfileVisibleTo(id.data, user)

  const parsed = profileUpdateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données de profil invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  try {
    // Le rôle n'est pas modifiable : il est absent du schéma de mise à jour.
    return await prisma.user.update({
      where: { id: id.data },
      data: parsed.data,
      select: profileSelect
    })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'Cette adresse e-mail est déjà utilisée.'
      })
    }
    throw err
  }
})
