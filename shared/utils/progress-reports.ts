import { z } from 'zod'
import type { ReportStatus } from '~/shared/utils/enums'

// NB: pas d'import runtime de l'objet enum Prisma dans ce module partagé
// (undefined côté client -> crash au chargement). Littéraux de chaîne uniquement.

export const reportCreateSchema = z
  .object({
    title: z.string().trim().min(1, 'Titre requis').max(200),
    periodStart: z.string().min(1, 'Date de début requise'),
    periodEnd: z.string().min(1, 'Date de fin requise'),
    body: z.string().trim().min(1, 'Décrivez vos activités').max(10000),
    difficulties: z.string().trim().max(5000).nullable().optional(),
    learnings: z.string().trim().max(5000).nullable().optional()
  })
  .refine(
    (d) => {
      const s = new Date(d.periodStart)
      const e = new Date(d.periodEnd)
      return !Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && e >= s
    },
    { message: 'La fin de période doit suivre le début.', path: ['periodEnd'] }
  )

export type ReportCreateInput = z.infer<typeof reportCreateSchema>

export const reportReviewSchema = z.object({
  decision: z.enum(['valide', 'a_revoir']),
  feedback: z.string().trim().max(5000).nullable().optional()
})

export type ReportReviewInput = z.infer<typeof reportReviewSchema>

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  brouillon: 'Brouillon',
  soumis: 'Soumis',
  valide: 'Validé',
  a_revoir: 'À revoir'
}

export function reportStatusLabel(status: ReportStatus): string {
  return REPORT_STATUS_LABELS[status]
}

export function reportStatusColor(
  status: ReportStatus
): 'neutral' | 'info' | 'success' | 'warning' {
  switch (status) {
    case 'brouillon':
      return 'neutral'
    case 'soumis':
      return 'info'
    case 'valide':
      return 'success'
    default:
      return 'warning'
  }
}

/** Transitions autorisées de la machine à états (appliquée côté serveur). */
export const REPORT_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  brouillon: ['soumis'],
  soumis: ['valide', 'a_revoir'],
  a_revoir: ['soumis'],
  valide: []
}

export function canTransition(from: ReportStatus, to: ReportStatus): boolean {
  return REPORT_TRANSITIONS[from].includes(to)
}
