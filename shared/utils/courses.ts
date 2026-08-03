import { z } from 'zod'

const title = z
  .string({ error: 'Le titre est requis.' })
  .trim()
  .min(1, 'Le titre est requis.')
  .max(200, '200 caractères maximum.')

const description = z
  .string()
  .trim()
  .max(5000, '5000 caractères maximum.')
  .nullable()

/**
 * Vrai si la période est cohérente. Une borne absente rend la période valide :
 * la mise à jour partielle fusionne les valeurs existantes avant de vérifier.
 */
export function assignmentRangeIsValid(
  startDate: Date | null | undefined,
  endDate: Date | null | undefined
): boolean {
  if (!startDate || !endDate) return true
  return endDate.getTime() >= startDate.getTime()
}

/** `createdById` est volontairement absent : il est forcé depuis la session. */
export const courseCreateSchema = z.object({
  title,
  description: description.optional()
})

export const courseUpdateSchema = z
  .object({
    title: title.optional(),
    description: description.optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Au moins un champ doit être fourni.'
  })

export const courseAssignmentCreateSchema = z
  .object({
    studentId: z.guid(),
    courseId: z.guid(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().nullable().optional()
  })
  .refine((data) => assignmentRangeIsValid(data.startDate, data.endDate), {
    message: 'La date de fin doit être postérieure à la date de début.',
    path: ['endDate']
  })

export const courseAssignmentUpdateSchema = z
  .object({
    studentId: z.guid().optional(),
    courseId: z.guid().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().nullable().optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Au moins un champ doit être fourni.'
  })
  .refine((data) => assignmentRangeIsValid(data.startDate, data.endDate), {
    message: 'La date de fin doit être postérieure à la date de début.',
    path: ['endDate']
  })

export type CourseCreateInput = z.input<typeof courseCreateSchema>
export type CourseUpdateInput = z.input<typeof courseUpdateSchema>
export type CourseAssignmentCreateInput = z.input<typeof courseAssignmentCreateSchema>
export type CourseAssignmentUpdateInput = z.input<typeof courseAssignmentUpdateSchema>
