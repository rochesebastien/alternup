import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireRole } from '~/server/utils/require-role'
import { learnerIdsOf } from '~/server/utils/network'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { announcementCreateSchema } from '~/shared/utils/announcements'

export default defineEventHandler(async (event) => {
  const user = await requireRole(event, Role.Tutor)

  const parsed = announcementCreateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Données d\'annonce invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const { title, body, pinned, recipientIds } = parsed.data

  const allowed = new Set(await learnerIdsOf(user.id))
  const invalid = recipientIds.some((id) => !allowed.has(id))
  if (invalid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Un ou plusieurs destinataires ne font pas partie de votre réseau.'
    })
  }

  return prisma.announcement.create({
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
})
