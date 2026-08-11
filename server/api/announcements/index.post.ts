import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { networkIdsOf } from '~/server/utils/network'
import { excerpt, notifyUsers } from '~/server/utils/notifications'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { announcementCreateSchema } from '~/shared/utils/announcements'

/**
 * Publication d'une annonce. Ouverte à tous les rôles : un tuteur adresse ses
 * apprenants, un alternant/stagiaire adresse son ou ses tuteurs. Les
 * destinataires restent bornés au réseau de l'auteur.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const parsed = announcementCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données d\'annonce invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const { title, body, pinned, recipientIds } = parsed.data

  const allowed = new Set(await networkIdsOf(user))
  const invalid = recipientIds.some((id) => !allowed.has(id))
  if (invalid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Un ou plusieurs destinataires ne font pas partie de votre réseau.'
    })
  }

  const announcement = await prisma.announcement.create({
    data: {
      authorId: user.id,
      title,
      body,
      pinned: pinned ?? false,
      recipients: {
        create: recipientIds.map((studentId) => ({ studentId }))
      }
    },
    include: {
      recipients: {
        include: {
          student: { select: { id: true, firstName: true, lastName: true } }
        }
      }
    }
  })

  await notifyUsers(recipientIds, {
    type: 'annonce',
    title: `Nouvelle annonce : ${title}`,
    body: excerpt(body),
    link: '/annonces'
  })

  return announcement
})
