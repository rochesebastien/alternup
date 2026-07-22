import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { loadConversationVisibleTo } from '~/server/utils/messages'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide' })
  const id = idp.data

  const conv = await loadConversationVisibleTo(id, user)

  await prisma.message.updateMany({
    where: { conversationId: id, authorId: { not: user.id }, readAt: null },
    data: { readAt: new Date() }
  })

  const other = user.role === Role.Tutor ? conv.student : conv.tutor

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, authorId: true, body: true, createdAt: true }
  })

  return {
    conversation: {
      id: conv.id,
      other: { id: other.id, firstName: other.firstName, lastName: other.lastName }
    },
    messages
  }
})
