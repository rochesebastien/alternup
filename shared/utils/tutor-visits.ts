import { z } from 'zod'
import type { VisitStatus } from '@prisma/client'

// Littéraux de chaîne uniquement (pas d'objet enum Prisma runtime en code partagé).

export const visitCreateSchema = z.object({
  studentId: z.guid(),
  scheduledAt: z.string().min(1, 'Date requise'),
  mode: z.string().trim().max(100).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional()
})

export type VisitCreateInput = z.infer<typeof visitCreateSchema>

export const visitUpdateSchema = z.object({
  scheduledAt: z.string().min(1).optional(),
  mode: z.string().trim().max(100).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  status: z.enum(['planifiee', 'realisee', 'annulee']).optional(),
  summary: z.string().trim().max(10000).nullable().optional(),
  nextSteps: z.string().trim().max(5000).nullable().optional()
})

export type VisitUpdateInput = z.infer<typeof visitUpdateSchema>

export const VISIT_STATUS_LABELS: Record<VisitStatus, string> = {
  planifiee: 'Planifiée',
  realisee: 'Réalisée',
  annulee: 'Annulée'
}

export function visitStatusLabel(status: VisitStatus): string {
  return VISIT_STATUS_LABELS[status]
}

export function visitStatusColor(status: VisitStatus): 'info' | 'success' | 'neutral' {
  switch (status) {
    case 'planifiee':
      return 'info'
    case 'realisee':
      return 'success'
    default:
      return 'neutral'
  }
}

export const VISIT_STATUS_OPTIONS: Array<{ label: string; value: VisitStatus }> = [
  { value: 'planifiee', label: 'Planifiée' },
  { value: 'realisee', label: 'Réalisée' },
  { value: 'annulee', label: 'Annulée' }
]

export const VISIT_MODE_OPTIONS: Array<{ label: string; value: string }> = [
  { value: 'entreprise', label: 'Entreprise' },
  { value: 'ecole', label: 'École' },
  { value: 'visio', label: 'Visio' }
]

export function visitModeLabel(mode: string | null): string {
  return VISIT_MODE_OPTIONS.find((m) => m.value === mode)?.label ?? (mode ?? '—')
}
