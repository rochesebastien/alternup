import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import type { PublicInvitation } from '~/shared/utils/invitations'

/**
 * Consultation publique d'une invitation par son token (page /register).
 * Route volontairement hors authentification (cf. `public-routes.ts`) : le
 * token, aléatoire et à durée de vie courte, fait office de capacité d'accès.
 *
 * Elle vit dans un sous-dossier `token/` et non à la racine `invitations/` :
 * deux fichiers `[token].get.ts` et `[id].delete.ts` dans un même dossier
 * partagent le même segment dynamique côté routeur Nitro, qui ne retient qu'un
 * seul nom de paramètre. `getRouterParam(event, 'token')` renvoyait alors
 * `undefined` et tous les liens d'invitation répondaient 404.
 */
export default defineEventHandler(async (event): Promise<PublicInvitation> => {
  const token = z.string().min(1).max(200).safeParse(getRouterParam(event, 'token'))
  if (!token.success) {
    throw createError({ statusCode: 404, statusMessage: 'Invitation introuvable.' })
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token: token.data },
    include: { tutor: { select: { firstName: true, lastName: true } } }
  })

  if (!invitation || invitation.acceptedAt) {
    throw createError({ statusCode: 404, statusMessage: 'Invitation introuvable.' })
  }
  if (invitation.expiresAt < new Date()) {
    throw createError({ statusCode: 410, statusMessage: 'Cette invitation a expiré.' })
  }

  return {
    email: invitation.email,
    firstName: invitation.firstName,
    lastName: invitation.lastName,
    role: invitation.role as PublicInvitation['role'],
    tutor: invitation.tutor,
    expiresAt: invitation.expiresAt.toISOString()
  }
})
