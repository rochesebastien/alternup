import { z } from 'zod'

export const calendarEventCreateSchema = z
  .object({
    studentId: z.guid(),
    title: z.string().trim().min(1).max(200),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    courseAssignmentId: z.guid().nullable().optional()
  })
  .refine((d) => d.endTime > d.startTime, {
    message: 'La date de fin doit être postérieure à la date de début.',
    path: ['endTime']
  })

export const calendarEventUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
    courseAssignmentId: z.guid().nullable().optional()
  })
  .refine(
    (d) => {
      if (d.startTime && d.endTime) return d.endTime > d.startTime
      return true
    },
    { message: 'La date de fin doit être postérieure à la date de début.', path: ['endTime'] }
  )
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Au moins un champ doit être fourni.'
  })

export const eventNoteUpsertSchema = z.object({
  grade: z.coerce.number().min(0).max(20).nullable().optional(),
  comment: z.string().trim().max(5000).nullable().optional(),
  notionsCovered: z.array(z.string().trim().min(1)).nullable().optional()
})

export type CalendarEventCreateInput = z.input<typeof calendarEventCreateSchema>
export type CalendarEventUpdateInput = z.input<typeof calendarEventUpdateSchema>
export type EventNoteUpsertInput = z.input<typeof eventNoteUpsertSchema>
