import { z } from 'zod'
import type { AttendanceStatus } from '@prisma/client'

// NB: on n'importe PAS l'objet enum Prisma au runtime dans ce module partagé
// (il est `undefined` dans le bundle client -> crash au chargement). On travaille
// avec des littéraux de chaîne et `import type`. Cf. taches/lecons.md.

export const attendanceInputSchema = z.object({
  status: z.enum(['present', 'absent', 'retard', 'excuse']),
  minutesLate: z.number().int().min(0).max(600).nullable().optional(),
  justification: z.string().trim().max(2000).nullable().optional()
})

export type AttendanceInput = z.infer<typeof attendanceInputSchema>

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Présent',
  absent: 'Absent',
  retard: 'Retard',
  excuse: 'Excusé'
}

export function attendanceStatusLabel(status: AttendanceStatus): string {
  return ATTENDANCE_STATUS_LABELS[status]
}

/** Couleur UBadge par statut (sémantique NuxtUI). */
export function attendanceStatusColor(
  status: AttendanceStatus
): 'success' | 'error' | 'warning' | 'neutral' {
  switch (status) {
    case 'present':
      return 'success'
    case 'absent':
      return 'error'
    case 'retard':
      return 'warning'
    default:
      return 'neutral'
  }
}

export const ATTENDANCE_STATUS_OPTIONS: Array<{ label: string; value: AttendanceStatus }> = [
  { value: 'present', label: 'Présent' },
  { value: 'absent', label: 'Absent' },
  { value: 'retard', label: 'Retard' },
  { value: 'excuse', label: 'Excusé' }
]
