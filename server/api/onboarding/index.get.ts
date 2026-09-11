import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { toOnboardingView } from '~/server/utils/onboarding'

/** Réponses d'onboarding de l'utilisateur connecté, `null` s'il n'a rien renseigné. */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const row = await prisma.onboardingProfile.findUnique({ where: { userId: user.id } })
  return row ? toOnboardingView(row) : null
})
