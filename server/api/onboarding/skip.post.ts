import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { sessionUserSelect, toSessionUser } from '~/server/utils/session'

/**
 * « Compléter plus tard » : l'onboarding est marqué terminé sans réponse, pour
 * ne plus bloquer la navigation. Le questionnaire reste accessible depuis
 * « Mon compte » (/onboarding?again=1). Les réponses déjà enregistrées, s'il y
 * en a, sont conservées.
 */
export default defineEventHandler(async (event) => {
  const current = await requireAuth(event)

  const user = await prisma.user.update({
    where: { id: current.id },
    data: { onboardingCompletedAt: current.onboarded ? undefined : new Date() },
    select: sessionUserSelect
  })

  const sessionUser = toSessionUser(user)
  await setUserSession(event, { user: sessionUser })
  return sessionUser
})
