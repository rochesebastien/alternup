import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { learnerIdsOf } from '~/server/utils/network'
import { getOrCreateConversation } from '~/server/utils/messages'

type ConversationSummary = {
  id: string
  other: { id: string; firstName: string; lastName: string }
  lastMessage: { body: string; createdAt: Date } | null
  unread: number
  updatedAt: Date
}

async function summarize(
  conversation: {
    id: string
    updatedAt: Date
    tutor: { id: string; firstName: string; lastName: string }
    student: { id: string; firstName: string; lastName: string }
  },
  userId: string,
  otherIsStudent: boolean
): Promise<ConversationSummary> {
  const [last, unread] = await Promise.all([
    prisma.message.findFirst({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      select: { body: true, createdAt: true }
    }),
    prisma.message.count({
      where: { conversationId: conversation.id, authorId: { not: userId }, readAt: null }
    })
  ])
  const other = otherIsStudent ? conversation.student : conversation.tutor
  return {
    id: conversation.id,
    other: { id: other.id, firstName: other.firstName, lastName: other.lastName },
    lastMessage: last ? { body: last.body, createdAt: last.createdAt } : null,
    unread,
    updatedAt: conversation.updatedAt
  }
}

export default defineEventHandler(async (event): Promise<ConversationSummary[]> => {
  const user = await requireAuth(event)

  if (user.role === Role.Tutor) {
    const studentIds = await learnerIdsOf(user.id)
    const conversations = await Promise.all(
      studentIds.map((studentId) => getOrCreateConversation(user.id, studentId))
    )
    const summaries = await Promise.all(
      conversations.map((conv) => summarize(conv, user.id, true))
    )
    return summaries.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  const link = await prisma.tutorStudent.findFirst({ where: { studentId: user.id } })
  if (!link) return []
  const conv = await getOrCreateConversation(link.tutorId, user.id)
  return [await summarize(conv, user.id, false)]
})
