import { z } from 'zod'
import {
  AttendanceStatus,
  CompetencyLevel,
  ProjectStatus,
  ReportStatus,
  Role,
  VisitStatus
} from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { assertCanViewStudent } from '~/server/utils/network'
import { assessStudentsRisk } from '~/server/utils/risk'
import { studentCompetencyMap } from '~/server/utils/competencies'
import { attendanceStatusLabel } from '~/shared/utils/attendance'
import { competencyLevelLabel } from '~/shared/utils/competencies'
import { reportStatusLabel } from '~/shared/utils/progress-reports'
import { projectStatusLabel } from '~/shared/utils/projects'
import { visitModeLabel, visitStatusLabel } from '~/shared/utils/tutor-visits'
import {
  OVERVIEW_TIMELINE_LIMIT,
  OVERVIEW_UPCOMING_LIMIT,
  mergeTimeline,
  mergeUpcoming,
  type OverviewEvent,
  type OverviewUpcoming,
  type StudentOverview
} from '~/shared/utils/overview'

/** Nombre d'éléments lus par source avant fusion (la timeline en garde 50). */
const PER_SOURCE_LIMIT = OVERVIEW_TIMELINE_LIMIT

/** Longueur max des extraits de texte libre embarqués dans la timeline. */
const EXCERPT_LENGTH = 240

function excerpt(text: string | null): string | null {
  if (!text) return null
  const trimmed = text.trim()
  if (trimmed.length <= EXCERPT_LENGTH) return trimmed
  return `${trimmed.slice(0, EXCERPT_LENGTH).trimEnd()}…`
}

/** Moyenne arrondie à une décimale, `null` si aucune valeur exploitable. */
function averageGrade(rows: Array<{ grade: unknown }>): number | null {
  const values = rows
    .map((row) => Number(row.grade))
    .filter((value) => Number.isFinite(value))
  if (values.length === 0) return null
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

/** Intitulé d'une visite : « Visite entreprise », ou générique si le mode est vide. */
function visitTitle(mode: string | null): string {
  return mode ? `Visite ${visitModeLabel(mode).toLowerCase()}` : 'Visite tuteur'
}

/** Note formatée pour la description d'un événement de timeline. */
function gradeText(grade: unknown): string | null {
  const value = Number(grade)
  if (grade === null || grade === undefined || !Number.isFinite(value)) return null
  return `${(Math.round(value * 10) / 10).toString().replace('.', ',')}/20`
}

export default defineEventHandler(async (event): Promise<StudentOverview> => {
  const user = await requireAuth(event)

  const idp = z.guid().safeParse(getRouterParam(event, 'id'))
  if (!idp.success) {
    throw createError({ statusCode: 400, statusMessage: 'Identifiant invalide' })
  }
  const studentId = idp.data

  // 404 (jamais 403) si l'appelant n'a pas de lien de visibilité avec l'étudiant.
  await assertCanViewStudent(studentId, user)

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true
    }
  })
  if (!student) {
    throw createError({ statusCode: 404, statusMessage: 'Ressource introuvable' })
  }

  const now = new Date()

  // Lien de réseau : celui du tuteur connecté, sinon le premier rattachement
  // connu (cas de l'étudiant qui consulte sa propre fiche). Il détermine le
  // référentiel de compétences et le fil de discussion à exposer.
  const link = await prisma.tutorStudent.findFirst({
    where: {
      studentId,
      ...(user.role === Role.Tutor ? { tutorId: user.id } : {})
    },
    orderBy: { addedAt: 'asc' },
    select: { tutorId: true, addedAt: true }
  })

  const [
    gradedNotes,
    attendances,
    missionRows,
    validatedReports,
    competencyMap,
    conversation,
    riskByStudent
  ] = await Promise.all([
    prisma.courseNote.findMany({
      where: { grade: { not: null }, assignment: { studentId } },
      select: { grade: true }
    }),
    prisma.attendance.findMany({
      where: { event: { studentId } },
      select: { status: true }
    }),
    prisma.projectAssignment.findMany({
      where: { studentId },
      select: { status: true }
    }),
    prisma.progressReport.count({ where: { studentId, status: ReportStatus.valide } }),
    link ? studentCompetencyMap(studentId, link.tutorId) : Promise.resolve(null),
    link
      ? prisma.conversation.findUnique({
          where: { tutorId_studentId: { tutorId: link.tutorId, studentId } },
          select: { id: true }
        })
      : Promise.resolve(null),
    assessStudentsRisk([studentId], now)
  ])

  // ─────────────────────────── KPIs ───────────────────────────

  const recordedAttendance = attendances.length
  const presentish = attendances.filter(
    (a) => a.status === AttendanceStatus.present || a.status === AttendanceStatus.retard
  ).length
  const attendanceRate =
    recordedAttendance > 0 ? Math.round((presentish / recordedAttendance) * 100) : null

  const missionStatuses = missionRows.map((row) => row.status)
  const missions = Object.values(ProjectStatus).map((status) => ({
    status: status as string,
    label: projectStatusLabel(status),
    count: missionStatuses.filter((s) => s === status).length
  }))

  const allCompetencies = competencyMap?.domains.flatMap((d) => d.competencies) ?? []
  const acquired = allCompetencies.filter(
    (c) => c.level === CompetencyLevel.acquis || c.level === CompetencyLevel.maitrise
  ).length
  const competencyRate =
    allCompetencies.length > 0
      ? Math.round((acquired / allCompetencies.length) * 100)
      : null

  // ─────────────────────────── Timeline ───────────────────────────

  const [notes, updates, reports, visits, attendanceIssues, cards, assessments] =
    await Promise.all([
      prisma.courseNote.findMany({
        where: { assignment: { studentId } },
        orderBy: { sessionDate: 'desc' },
        take: PER_SOURCE_LIMIT,
        select: {
          id: true,
          sessionDate: true,
          grade: true,
          comment: true,
          assignment: { select: { course: { select: { title: true } } } }
        }
      }),
      prisma.projectUpdate.findMany({
        where: { assignment: { studentId } },
        orderBy: { createdAt: 'desc' },
        take: PER_SOURCE_LIMIT,
        select: {
          id: true,
          body: true,
          createdAt: true,
          assignment: {
            select: { projectId: true, project: { select: { title: true } } }
          }
        }
      }),
      prisma.progressReport.findMany({
        where: { studentId, submittedAt: { not: null } },
        orderBy: { submittedAt: 'desc' },
        take: PER_SOURCE_LIMIT,
        select: {
          id: true,
          title: true,
          status: true,
          submittedAt: true,
          reviewedAt: true
        }
      }),
      prisma.tutorVisit.findMany({
        where: { studentId, scheduledAt: { lte: now } },
        orderBy: { scheduledAt: 'desc' },
        take: PER_SOURCE_LIMIT,
        select: {
          id: true,
          scheduledAt: true,
          status: true,
          mode: true,
          summary: true
        }
      }),
      prisma.attendance.findMany({
        where: {
          event: { studentId },
          status: { in: [AttendanceStatus.absent, AttendanceStatus.retard] }
        },
        orderBy: { event: { startTime: 'desc' } },
        take: PER_SOURCE_LIMIT,
        select: {
          id: true,
          status: true,
          minutesLate: true,
          justification: true,
          event: {
            select: {
              title: true,
              startTime: true,
              courseAssignment: { select: { course: { select: { title: true } } } }
            }
          }
        }
      }),
      prisma.reportCard.findMany({
        where: { studentId, publishedAt: { not: null } },
        orderBy: { publishedAt: 'desc' },
        take: PER_SOURCE_LIMIT,
        select: {
          id: true,
          publishedAt: true,
          generalComment: true,
          period: { select: { label: true } }
        }
      }),
      prisma.competencyAssessment.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        take: PER_SOURCE_LIMIT,
        select: {
          id: true,
          level: true,
          comment: true,
          createdAt: true,
          competency: {
            select: { label: true, domain: { select: { label: true } } }
          }
        }
      })
    ])

  const competencyLink = `/competences?student=${studentId}`

  const noteEvents: OverviewEvent[] = notes.map((note) => ({
    id: `note:${note.id}`,
    date: note.sessionDate.toISOString(),
    type: 'note',
    title: note.assignment.course.title,
    description:
      [gradeText(note.grade), excerpt(note.comment)].filter(Boolean).join(' — ') || null,
    link: null
  }))

  const updateEvents: OverviewEvent[] = updates.map((update) => ({
    id: `retour_mission:${update.id}`,
    date: update.createdAt.toISOString(),
    type: 'retour_mission',
    title: update.assignment.project.title,
    description: excerpt(update.body),
    link: `/projects/${update.assignment.projectId}`
  }))

  const reportEvents: OverviewEvent[] = reports.map((report) => ({
    id: `rapport:${report.id}`,
    // La date qui fait foi est celle du dernier mouvement du rapport.
    date: (report.reviewedAt ?? report.submittedAt ?? now).toISOString(),
    type: 'rapport',
    title: report.title,
    description: reportStatusLabel(report.status),
    link: `/rapports/${report.id}`
  }))

  const visitEvents: OverviewEvent[] = visits.map((visit) => ({
    id: `visite:${visit.id}`,
    date: visit.scheduledAt.toISOString(),
    type: 'visite',
    title: visitTitle(visit.mode),
    description:
      [visitStatusLabel(visit.status), excerpt(visit.summary)].filter(Boolean).join(' — ') ||
      null,
    link: '/visites'
  }))

  const attendanceEvents: OverviewEvent[] = attendanceIssues.map((item) => ({
    id: `absence:${item.id}`,
    date: item.event.startTime.toISOString(),
    type: 'absence',
    title: `${attendanceStatusLabel(item.status)} — ${
      item.event.courseAssignment?.course.title ?? item.event.title
    }`,
    description:
      [
        item.status === AttendanceStatus.retard && item.minutesLate
          ? `${item.minutesLate} min de retard`
          : null,
        excerpt(item.justification)
      ]
        .filter(Boolean)
        .join(' — ') || null,
    link: '/presences'
  }))

  const cardEvents: OverviewEvent[] = cards.map((card) => ({
    id: `bulletin:${card.id}`,
    date: (card.publishedAt ?? now).toISOString(),
    type: 'bulletin',
    title: `Bulletin — ${card.period.label}`,
    description: excerpt(card.generalComment),
    // Fiche du bulletin (accessible aux deux parties), et non la page de
    // période `/bulletins/[id]` qui est réservée au tuteur.
    link: `/bulletins/carte/${card.id}`
  }))

  const assessmentEvents: OverviewEvent[] = assessments.map((assessment) => ({
    id: `competence:${assessment.id}`,
    date: assessment.createdAt.toISOString(),
    type: 'competence',
    title: `${assessment.competency.domain.label} · ${assessment.competency.label}`,
    description:
      [competencyLevelLabel(assessment.level), excerpt(assessment.comment)]
        .filter(Boolean)
        .join(' — ') || null,
    link: competencyLink
  }))

  const timeline = mergeTimeline([
    noteEvents,
    updateEvents,
    reportEvents,
    visitEvents,
    attendanceEvents,
    cardEvents,
    assessmentEvents
  ])

  // ─────────────────────────── À venir ───────────────────────────

  const [plannedVisits, futureSessions] = await Promise.all([
    prisma.tutorVisit.findMany({
      where: { studentId, scheduledAt: { gte: now }, status: VisitStatus.planifiee },
      orderBy: { scheduledAt: 'asc' },
      take: OVERVIEW_UPCOMING_LIMIT,
      select: { id: true, scheduledAt: true, mode: true, location: true }
    }),
    prisma.calendarEvent.findMany({
      where: { studentId, startTime: { gte: now } },
      orderBy: { startTime: 'asc' },
      take: OVERVIEW_UPCOMING_LIMIT,
      select: {
        id: true,
        title: true,
        startTime: true,
        courseAssignment: { select: { course: { select: { title: true } } } }
      }
    })
  ])

  const upcomingVisits: OverviewUpcoming[] = plannedVisits.map((visit) => ({
    id: `visite:${visit.id}`,
    date: visit.scheduledAt.toISOString(),
    type: 'visite',
    title: visitTitle(visit.mode),
    description: visit.location,
    link: '/visites'
  }))

  const upcomingSessions: OverviewUpcoming[] = futureSessions.map((session) => ({
    id: `session:${session.id}`,
    date: session.startTime.toISOString(),
    type: 'session',
    title: session.courseAssignment?.course.title ?? session.title,
    description: null,
    link: '/calendar'
  }))

  const risk = riskByStudent.get(studentId) ?? { score: 0, level: 'ok', reasons: [] }

  return {
    student: {
      id: student.id,
      email: student.email,
      firstName: student.firstName,
      lastName: student.lastName,
      role: student.role,
      addedAt: link?.addedAt.toISOString() ?? null
    },
    kpis: {
      avgGrade: averageGrade(gradedNotes),
      attendanceRate,
      attendanceRecorded: recordedAttendance,
      missions,
      missionsTotal: missionStatuses.length,
      competencyRate,
      competencyTotal: allCompetencies.length,
      validatedReports
    },
    risk: { score: risk.score, level: risk.level, reasons: risk.reasons },
    timeline,
    upcoming: mergeUpcoming([upcomingVisits, upcomingSessions]),
    links: {
      reports: '/rapports',
      reportCards: '/bulletins',
      competencies: competencyLink,
      visits: '/visites',
      conversation: conversation ? `/messages/${conversation.id}` : null
    }
  }
})
