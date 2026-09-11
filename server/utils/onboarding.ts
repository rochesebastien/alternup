import type { OnboardingProfile } from '@prisma/client'
import type { OnboardingProfileView } from '~/shared/utils/onboarding'
import { onboardingAnswersSchema } from '~/shared/utils/onboarding'

function toIsoDate(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null
}

/**
 * Profil d'onboarding tel qu'exposé par l'API : les `@db.Date` Prisma sont
 * renvoyées en `YYYY-MM-DD` (le client les réinjecte telles quelles dans les
 * champs `<input type="date">`), les valeurs sont repassées par le schéma pour
 * garantir un objet complet, même pour une ligne partiellement renseignée.
 */
export function toOnboardingView(row: OnboardingProfile): OnboardingProfileView {
  const answers = onboardingAnswersSchema.parse({
    ...row,
    dateDebutContrat: toIsoDate(row.dateDebutContrat),
    dateFinContrat: toIsoDate(row.dateFinContrat)
  })
  return { ...answers, updatedAt: row.updatedAt.toISOString() }
}
