import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { sessionUserSelect, toSessionUser } from '~/server/utils/session'

/**
 * « Compléter plus tard » : l'onboarding est marqué passé (et non terminé) pour
 * ne plus bloquer la navigation. Tant qu'il n'est pas terminé, le menu du
 * compte affiche une entrée « Onboarding » et une relance épinglée reste dans
 * les notifications. Sans effet sur un onboarding déjà terminé.
 */
export default defineEventHandler(async (event) => {
  const current = await requireAuth(event)

  const user = await prisma.user.update({
    where: { id: current.id },
    data: current.onboarding === 'todo' ? { onboardingSkippedAt: new Date() } : {},
    select: sessionUserSelect
  })

  const sessionUser = toSessionUser(user)
  await setUserSession(event, { user: sessionUser })
  return sessionUser
})
