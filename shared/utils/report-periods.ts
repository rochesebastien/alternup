import { z } from 'zod'

export const periodCreateSchema = z
  .object({
    label: z.string().trim().min(1, 'Libellé requis').max(200),
    startDate: z.string().min(1, 'Date de début requise'),
    endDate: z.string().min(1, 'Date de fin requise')
  })
  .refine(
    (d) => {
      const s = new Date(d.startDate)
      const e = new Date(d.endDate)
      return !Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && e >= s
    },
    { message: 'La fin de période doit suivre le début.', path: ['endDate'] }
  )

export type PeriodCreateInput = z.infer<typeof periodCreateSchema>

export const cardPublishSchema = z.object({
  studentId: z.guid(),
  generalComment: z.string().trim().max(5000).nullable().optional()
})

export type CardPublishInput = z.infer<typeof cardPublishSchema>

/** Contenu figé d'un bulletin au moment de sa publication. */
export interface ReportCardSnapshot {
  courses: Array<{ title: string; average: number; count: number }>
  overallAverage: number | null
  attendance: {
    total: number
    present: number
    absent: number
    retard: number
    excuse: number
    rate: number | null
  }
}
