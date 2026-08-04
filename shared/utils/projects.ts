import { z } from 'zod'
import { ProjectStatus } from '~/shared/utils/enums'

const title = z.string().trim().min(1, 'Title is required').max(200)
const description = z.string().trim().max(5000).nullable()

export const projectCreateSchema = z.object({
  title,
  description: description.optional(),
  internal: z.boolean().optional()
})

export const projectUpdateSchema = z
  .object({
    title: title.optional(),
    description: description.optional(),
    internal: z.boolean().optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required'
  })

export const assignmentCreateSchema = z.object({
  projectId: z.guid(),
  studentId: z.guid(),
  status: z.nativeEnum(ProjectStatus).optional(),
  tutorComment: z.string().trim().max(5000).nullable().optional(),
  studentComment: z.string().trim().max(5000).nullable().optional(),
  startedAt: z.coerce.date().nullable().optional()
})

export const assignmentUpdateSchema = z
  .object({
    status: z.nativeEnum(ProjectStatus).optional(),
    tutorComment: z.string().trim().max(5000).nullable().optional(),
    studentComment: z.string().trim().max(5000).nullable().optional(),
    startedAt: z.coerce.date().nullable().optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required'
  })

export type ProjectCreateInput = z.input<typeof projectCreateSchema>
export type ProjectUpdateInput = z.input<typeof projectUpdateSchema>
export type AssignmentCreateInput = z.input<typeof assignmentCreateSchema>
export type AssignmentUpdateInput = z.input<typeof assignmentUpdateSchema>

const STUDENT_EDITABLE_FIELDS = ['status', 'studentComment'] as const
export type StudentEditableField = (typeof STUDENT_EDITABLE_FIELDS)[number]

export function pickStudentEditableFields(
  data: AssignmentUpdateInput
): Partial<Pick<AssignmentUpdateInput, StudentEditableField>> {
  const result: Partial<Pick<AssignmentUpdateInput, StudentEditableField>> = {}
  for (const key of STUDENT_EDITABLE_FIELDS) {
    if (key in data) {
      ;(result as Record<string, unknown>)[key] = (data as Record<string, unknown>)[key]
    }
  }
  return result
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  non_demarre: 'Non démarré',
  en_cours: 'En cours',
  termine: 'Terminé',
  annule: 'Annulé'
}

const STATUS_COLORS: Record<ProjectStatus, 'neutral' | 'primary' | 'success' | 'error'> = {
  non_demarre: 'neutral',
  en_cours: 'primary',
  termine: 'success',
  annule: 'error'
}

export function projectStatusLabel(status: ProjectStatus): string {
  return STATUS_LABELS[status]
}

export function projectStatusColor(
  status: ProjectStatus
): 'neutral' | 'primary' | 'success' | 'error' {
  return STATUS_COLORS[status]
}

export const PROJECT_STATUS_OPTIONS: Array<{
  value: ProjectStatus
  label: string
}> = (Object.values(ProjectStatus) as ProjectStatus[]).map((value) => ({
  value,
  label: STATUS_LABELS[value]
}))
