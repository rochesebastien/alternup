import { Role } from '@prisma/client'
import { requireRole } from '~/server/utils/require-role'
import { assessTutorNetworkRisk } from '~/server/utils/risk'

/**
 * Alertes de décrochage : score de risque de chaque étudiant du réseau du
 * tuteur connecté, du plus risqué au moins risqué.
 */
export default defineEventHandler(async (event) => {
  const tutor = await requireRole(event, Role.Tutor)
  return assessTutorNetworkRisk(tutor.id)
})
