import { z } from 'zod'
import type { CompetencyLevel } from '~/shared/utils/enums'

// Littéraux de chaîne uniquement côté partagé (pas d'objet enum Prisma runtime).

export const domainCreateSchema = z.object({
  label: z.string().trim().min(1, 'Libellé requis').max(200)
})

export const competencyCreateSchema = z.object({
  domainId: z.guid(),
  label: z.string().trim().min(1, 'Libellé requis').max(300)
})

export const assessSchema = z.object({
  competencyId: z.guid(),
  studentId: z.guid(),
  level: z.enum(['decouverte', 'en_cours', 'acquis', 'maitrise']),
  comment: z.string().trim().max(2000).nullable().optional()
})

export type AssessInput = z.infer<typeof assessSchema>

export const COMPETENCY_LEVEL_LABELS: Record<CompetencyLevel, string> = {
  decouverte: 'Découverte',
  en_cours: 'En cours',
  acquis: 'Acquis',
  maitrise: 'Maîtrise'
}

export const COMPETENCY_LEVEL_SCORE: Record<CompetencyLevel, number> = {
  decouverte: 1,
  en_cours: 2,
  acquis: 3,
  maitrise: 4
}

export const COMPETENCY_MAX_SCORE = 4

export function competencyLevelLabel(level: CompetencyLevel): string {
  return COMPETENCY_LEVEL_LABELS[level]
}

export function competencyLevelColor(
  level: CompetencyLevel
): 'neutral' | 'warning' | 'info' | 'success' {
  switch (level) {
    case 'decouverte':
      return 'neutral'
    case 'en_cours':
      return 'warning'
    case 'acquis':
      return 'info'
    default:
      return 'success'
  }
}

export const COMPETENCY_LEVEL_OPTIONS: Array<{ label: string; value: CompetencyLevel }> = [
  { value: 'decouverte', label: 'Découverte' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'acquis', label: 'Acquis' },
  { value: 'maitrise', label: 'Maîtrise' }
]
