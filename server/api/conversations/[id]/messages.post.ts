import { z } from 'zod'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { loadConversationVisibleTo } from '~/server/utils/messages'
import { excerpt, notifyUser } from '~/server/utils/notifications'
import { messageCreateSchema } from '~/shared/utils/messages'
import { formatZodIssues } from '~/shared/utils/auth-credentials'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide' })
  const id = idp.data

  const conversation = await loadConversationVisibleTo(id, user)

  const parsed = messageCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données invalides',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }
  const { body } = parsed.data

  const msg = await prisma.message.create({
    data: { conversationId: id, authorId: user.id, body }
  })

  await prisma.conversation.update({
    where: { id },
    data: { updatedAt: new Date() }
  })

  const recipientId
    = conversation.tutorId === user.id ? conversation.studentId : conversation.tutorId
  // Lien préfixé selon l'espace du destinataire (ADR-0001 §7).
  const space = recipientId === conversation.tutorId ? '/tuteur' : '/alternant'

  await notifyUser(recipientId, {
    type: 'message',
    title: `Message de ${user.firstName} ${user.lastName}`,
    body: excerpt(body),
    link: `${space}/messages/${id}`
  })

  return msg
})
