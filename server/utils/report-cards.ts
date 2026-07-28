import { Role } from '@prisma/client'
import type { User } from '#auth-utils'
import { prisma } from '~/server/utils/prisma'
import type { ReportCardSnapshot } from '~/shared/utils/report-periods'

/**
 * Calcule le contenu d'un bulletin (moyennes par cours + moyenne générale +
 * assiduité) pour un étudiant sur une fenêtre de dates. Ce résultat est figé
 * (snapshot JSON) au moment de la publication.
 */
export async function computeSnapshot(
  studentId: string,
  start: Date,
  end: Date
): Promise<ReportCardSnapshot> {
  const [notes, atts] = await Promise.all([
    prisma.courseNote.findMany({
      where: {
        grade: { not: null },
        assignment: { studentId },
        sessionDate: { gte: start, lte: end }
      },
      include: { assignment: { include: { course: { select: { title: true } } } } }
    }),
    prisma.attendance.findMany({
      where: { event: { studentId, startTime: { gte: start, lte: end } } },
      select: { status: true }
    })
  ])

  const byCourse = new Map<string, { title: string; sum: number; count: number }>()
  const allGrades: number[] = []
  for (const n of notes) {
    const grade = Number(n.grade)
    if (Number.isNaN(grade)) continue
    allGrades.push(grade)
    const title = n.assignment.course.title
    const g = byCourse.get(title) ?? { title, sum: 0, count: 0 }
    g.sum += grade
    g.count += 1
    byCourse.set(title, g)
  }

  const courses = [...byCourse.values()].map((c) => ({
    title: c.title,
    average: Math.round((c.sum / c.count) * 10) / 10,
    count: c.count
  }))
  const overallAverage =
    allGrades.length > 0
      ? Math.round((allGrades.reduce((a, b) => a + b, 0) / allGrades.length) * 10) / 10
      : null

  const countBy = (s: string) => atts.filter((a) => a.status === s).length
  const total = atts.length
  const present = countBy('present')
  const retard = countBy('retard')
  return {
    courses,
    overallAverage,
    attendance: {
      total,
      present,
      absent: countBy('absent'),
      retard,
      excuse: countBy('excuse'),
      rate: total > 0 ? Math.round(((present + retard) / total) * 100) : null
    }
  }
}

/** Charge une période appartenant au tuteur connecté. 404 sinon. */
export async function loadPeriodOwnedBy(id: string, user: User) {
  const period = await prisma.reportPeriod.findUnique({ where: { id } })
  if (!period || user.role !== Role.Tutor || period.tutorId !== user.id) {
    throw createError({ statusCode: 404, statusMessage: 'Période introuvable' })
  }
  return period
}

// Le tuteur de la période est embarqué : c'est l'un des deux signataires du
// bulletin, et l'écran de détail l'affiche dans le bloc « Signatures ».
const cardInclude = {
  period: {
    select: {
      id: true,
      label: true,
      startDate: true,
      endDate: true,
      tutorId: true,
      tutor: { select: { id: true, firstName: true, lastName: true } }
    }
  },
  student: { select: { id: true, firstName: true, lastName: true } }
} as const

export type VisibleReportCard = Awaited<ReturnType<typeof loadCardVisibleTo>>

/**
 * Charge un bulletin visible par l'étudiant concerné ou le tuteur de la période.
 * Un bulletin non publié reste un brouillon du tuteur : l'étudiant reçoit 404,
 * comme si le bulletin n'existait pas.
 */
export async function loadCardVisibleTo(id: string, user: User) {
  const card = await prisma.reportCard.findUnique({ where: { id }, include: cardInclude })
  const isTutor = card?.period.tutorId === user.id
  const isStudent = card?.studentId === user.id

  if (!card || (!isTutor && !isStudent) || (isStudent && !isTutor && card.publishedAt === null)) {
    throw createError({ statusCode: 404, statusMessage: 'Bulletin introuvable' })
  }
  return card
}
