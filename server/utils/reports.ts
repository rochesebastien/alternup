import type { User } from '#auth-utils'
import { prisma } from '~/server/utils/prisma'

const reportInclude = {
  student: { select: { id: true, firstName: true, lastName: true, email: true } },
  tutor: { select: { id: true, firstName: true, lastName: true } }
} as const

/**
 * Charge un rapport d'étape visible par l'utilisateur : soit l'étudiant auteur,
 * soit le tuteur destinataire. 404 sinon (on ne divulgue pas l'existence).
 */
export async function loadReportVisibleTo(id: string, user: User) {
  const report = await prisma.progressReport.findUnique({
    where: { id },
    include: reportInclude
  })
  if (!report || (report.studentId !== user.id && report.tutorId !== user.id)) {
    throw createError({ statusCode: 404, statusMessage: 'Rapport introuvable' })
  }
  return report
}
