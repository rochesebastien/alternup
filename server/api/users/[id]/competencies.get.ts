import { z } from 'zod'
import { Role } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { studentCompetencyMap } from '~/server/utils/competencies'
import { isTutorOf } from '~/server/utils/network'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide' })
  }
  const id = idp.data

  let tutorId: string
  if (user.id === id) {
    const link = await prisma.tutorStudent.findFirst({ where: { studentId: id } })
    if (!link) return { domains: [], overall: null }
    tutorId = link.tutorId
  } else if (user.role === Role.Tutor && (await isTutorOf(user.id, id))) {
    tutorId = user.id
  } else {
    throw createError({ statusCode: 404, statusMessage: 'Ressource introuvable' })
  }

  return await studentCompetencyMap(id, tutorId)
})
