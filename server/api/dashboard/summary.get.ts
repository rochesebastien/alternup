import { Role, ProjectStatus, ReportStatus, AttendanceStatus } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/require-role'
import { projectStatusLabel } from '~/shared/utils/projects'

const TREND_MONTHS = 8

const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'short' })

interface NoteRow {
  grade: unknown
  sessionDate: Date
}

/** Moyenne mensuelle des notes sur les TREND_MONTHS derniers mois (null si aucun). */
function buildGradeTrend(notes: NoteRow[], now: Date) {
  const buckets: { key: string; label: string; sum: number; count: number }[] = []
  for (let i = TREND_MONTHS - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: monthFmt.format(d).replace('.', ''),
      sum: 0,
      count: 0
    })
  }
  const index = new Map(buckets.map((b) => [b.key, b]))
  for (const n of notes) {
    if (n.grade == null) continue
    const d = new Date(n.sessionDate)
    const b = index.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (!b) continue
    b.sum += Number(n.grade)
    b.count += 1
  }
  return buckets.map((b) => ({
    label: b.label,
    value: b.count > 0 ? Math.round((b.sum / b.count) * 10) / 10 : null
  }))
}

function average(notes: NoteRow[]): number | null {
  const vals = notes.map((n) => Number(n.grade)).filter((v) => !Number.isNaN(v))
  if (vals.length === 0) return null
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
}

function missionsByStatus(statuses: ProjectStatus[]) {
  return Object.values(ProjectStatus).map((status) => ({
    status,
    label: projectStatusLabel(status),
    count: statuses.filter((s) => s === status).length
  }))
}

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const now = new Date()

  // ─────────────────────────── TUTEUR ───────────────────────────
  if (user.role === Role.Tutor) {
    const [learnerLinks, projects, upcoming, recentUpdates] = await Promise.all([
      prisma.tutorStudent.findMany({ where: { tutorId: user.id }, select: { studentId: true } }),
      prisma.project.findMany({ where: { createdById: user.id }, select: { id: true } }),
      prisma.calendarEvent.findMany({
        where: { tutorId: user.id, startTime: { gte: now } },
        orderBy: { startTime: 'asc' },
        take: 5,
        include: {
          student: { select: { firstName: true, lastName: true } },
          courseAssignment: { include: { course: { select: { title: true } } } }
        }
      }),
      prisma.projectUpdate.findMany({
        where: { assignment: { project: { createdById: user.id } } },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: {
          author: { select: { firstName: true, lastName: true, role: true } },
          assignment: {
            include: {
              project: { select: { title: true } },
              student: { select: { firstName: true, lastName: true } }
            }
          }
        }
      })
    ])

    const learnerIds = learnerLinks.map((l) => l.studentId)
    const projectIds = projects.map((p) => p.id)

    const [assignments, notes, reportsPending] = await Promise.all([
      prisma.projectAssignment.findMany({
        where: { projectId: { in: projectIds } },
        select: { status: true }
      }),
      prisma.courseNote.findMany({
        where: { grade: { not: null }, assignment: { studentId: { in: learnerIds } } },
        select: { grade: true, sessionDate: true }
      }),
      prisma.progressReport.count({ where: { tutorId: user.id, status: ReportStatus.soumis } })
    ])

    const statuses = assignments.map((a) => a.status)
    const avg = average(notes)

    return {
      role: user.role,
      stats: [
        { key: 'learners', label: 'Alternants & stagiaires', value: learnerIds.length },
        { key: 'projects', label: 'Projets', value: projectIds.length },
        { key: 'active', label: 'Missions en cours', value: statuses.filter((s) => s === ProjectStatus.en_cours).length },
        { key: 'reports', label: 'Rapports à valider', value: reportsPending },
        { key: 'grade', label: 'Note moyenne réseau', value: avg != null ? `${avg}/20` : '-' }
      ],
      avgGrade: avg,
      gradeTrend: buildGradeTrend(notes, now),
      missionsByStatus: missionsByStatus(statuses),
      recentUpdates: recentUpdates.map((u) => ({
        id: u.id,
        body: u.body,
        status: u.status,
        createdAt: u.createdAt,
        author: u.author,
        project: u.assignment.project.title,
        student: u.assignment.student
      })),
      upcomingSessions: upcoming.map((e) => ({
        id: e.id,
        title: e.courseAssignment?.course.title ?? e.title,
        startTime: e.startTime,
        student: e.student
      }))
    }
  }

  // ─────────────────────────── ALTERNANT / STAGIAIRE ───────────────────────────
  const [assignments, notes, recentNotes, upcoming, attendances] = await Promise.all([
    prisma.projectAssignment.findMany({ where: { studentId: user.id }, select: { status: true } }),
    prisma.courseNote.findMany({
      where: { grade: { not: null }, assignment: { studentId: user.id } },
      select: { grade: true, sessionDate: true },
      orderBy: { sessionDate: 'asc' }
    }),
    prisma.courseNote.findMany({
      where: { assignment: { studentId: user.id } },
      orderBy: { sessionDate: 'desc' },
      take: 5,
      include: { assignment: { include: { course: { select: { title: true } } } } }
    }),
    prisma.calendarEvent.findMany({
      where: { studentId: user.id, startTime: { gte: now } },
      orderBy: { startTime: 'asc' },
      take: 5,
      include: { courseAssignment: { include: { course: { select: { title: true } } } } }
    }),
    prisma.attendance.findMany({
      where: { event: { studentId: user.id } },
      select: { status: true }
    })
  ])

  const statuses = assignments.map((a) => a.status)
  const done = statuses.filter((s) => s === ProjectStatus.termine).length
  const avg = average(notes)

  const presentCount = attendances.filter(
    (a) => a.status === AttendanceStatus.present || a.status === AttendanceStatus.retard
  ).length
  const attendanceRate =
    attendances.length > 0 ? Math.round((presentCount / attendances.length) * 100) : null

  return {
    role: user.role,
    stats: [
      { key: 'grade', label: 'Note moyenne', value: avg != null ? `${avg}/20` : '-' },
      { key: 'attendance', label: 'Taux de présence', value: attendanceRate != null ? `${attendanceRate}%` : '-' },
      { key: 'missions', label: 'Missions terminées', value: `${done}/${statuses.length}` },
      { key: 'sessions', label: 'Sessions à venir', value: upcoming.length }
    ],
    avgGrade: avg,
    gradeTrend: buildGradeTrend(notes, now),
    missionsByStatus: missionsByStatus(statuses),
    recentNotes: recentNotes.map((n) => ({
      id: n.id,
      grade: n.grade != null ? Number(n.grade) : null,
      sessionDate: n.sessionDate,
      course: n.assignment.course.title
    })),
    upcomingSessions: upcoming.map((e) => ({
      id: e.id,
      title: e.courseAssignment?.course.title ?? e.title,
      startTime: e.startTime,
      student: null
    }))
  }
})
