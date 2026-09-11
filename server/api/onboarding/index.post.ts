import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { sessionUserSelect, toSessionUser } from '~/server/utils/session'
import { toOnboardingView } from '~/server/utils/onboarding'
import { formatZodIssues } from '~/shared/utils/auth-credentials'
import { answersForRole, onboardingAnswersSchema } from '~/shared/utils/onboarding'

function toDate(iso: string | null): Date | null {
  return iso ? new Date(`${iso}T00:00:00.000Z`) : null
}

/**
 * Fin du questionnaire d'onboarding : enregistre (ou remplace) les réponses,
 * marque l'onboarding terminé et réécrit la session pour que le middleware
 * laisse passer sans reconnexion. Idempotent : refaire le questionnaire depuis
 * « Mon compte » repasse par ici.
 */
export default defineEventHandler(async (event) => {
  const current = await requireAuth(event)

  const parsed = onboardingAnswersSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Réponses invalides.',
      data: { issues: formatZodIssues(parsed.error) }
    })
  }

  const answers = answersForRole(current.role, parsed.data)
  const data = {
    ...answers,
    dateDebutContrat: toDate(answers.dateDebutContrat),
    dateFinContrat: toDate(answers.dateFinContrat)
  }

  const [profile, user] = await prisma.$transaction([
    prisma.onboardingProfile.upsert({
      where: { userId: current.id },
      create: { userId: current.id, ...data },
      update: data
    }),
    prisma.user.update({
      where: { id: current.id },
      data: { onboardingCompletedAt: new Date() },
      select: sessionUserSelect
    })
  ])

  await setUserSession(event, { user: toSessionUser(user) })
  return toOnboardingView(profile)
})
