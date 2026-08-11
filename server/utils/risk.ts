import { AttendanceStatus, ReportStatus } from '@prisma/client'
import { prisma } from '~/server/utils/prisma'
import { computeRiskScore } from '~/shared/utils/risk'
import type { RiskAssessment, RiskMetrics } from '~/shared/utils/risk'

const DAY_MS = 86_400_000

/** Fenêtre d'observation de l'assiduité et des notes (jours). */
const RECENT_WINDOW_DAYS = 30
/** Fenêtre de comparaison des notes (30 jours précédents). */
const COMPARISON_WINDOW_DAYS = 60
/** Fenêtre de recherche de la dernière activité (au-delà, on considère « aucune activité »). */
const ACTIVITY_WINDOW_DAYS = 90

export interface StudentRiskEntry {
  student: { id: string; firstName: string; lastName: string }
  score: number
  level: RiskAssessment['level']
  reasons: string[]
}

function daysSince(date: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS))
}

function shift(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS)
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** Accumulateur brut par étudiant, avant passage à `computeRiskScore`. */
interface Bucket {
  sessions: number
  unexcusedAbsences: number
  lates: number
  lastSubmittedAt: Date | null
  reportsToRevise: number
  gradesRecent: number[]
  gradesPrevious: number[]
  lastActivityAt: Date | null
}

function emptyBucket(): Bucket {
  return {
    sessions: 0,
    unexcusedAbsences: 0,
    lates: 0,
    lastSubmittedAt: null,
    reportsToRevise: 0,
    gradesRecent: [],
    gradesPrevious: [],
    lastActivityAt: null
  }
}

function keepLatest(current: Date | null, candidate: Date): Date {
  return current === null || candidate > current ? candidate : current
}

function toMetrics(bucket: Bucket, now: Date): RiskMetrics {
  return {
    sessionsLast30: bucket.sessions,
    unexcusedAbsencesLast30: bucket.unexcusedAbsences,
    latesLast30: bucket.lates,
    daysSinceLastSubmittedReport:
      bucket.lastSubmittedAt === null ? null : daysSince(bucket.lastSubmittedAt, now),
    reportsToReviseCount: bucket.reportsToRevise,
    avgGradeLast30: average(bucket.gradesRecent),
    avgGradePrev30: average(bucket.gradesPrevious),
    daysSinceLastActivity:
      bucket.lastActivityAt === null ? null : daysSince(bucket.lastActivityAt, now)
  }
}

/**
 * Collecte les métriques de décrochage des étudiants passés en paramètre puis
 * calcule leur score. L'appelant est responsable du contrôle de visibilité :
 * ne passer que des étudiants du réseau du tuteur (ou l'utilisateur lui-même).
 */
export async function assessStudentsRisk(
  studentIds: string[],
  now: Date = new Date()
): Promise<Map<string, RiskAssessment>> {
  const result = new Map<string, RiskAssessment>()
  if (studentIds.length === 0) return result

  const recentSince = shift(now, RECENT_WINDOW_DAYS)
  const comparisonSince = shift(now, COMPARISON_WINDOW_DAYS)
  const activitySince = shift(now, ACTIVITY_WINDOW_DAYS)

  const [attendances, reports, notes, updates] = await Promise.all([
    // Assiduité : pointages des 30 derniers jours.
    prisma.attendance.findMany({
      where: { event: { studentId: { in: studentIds }, startTime: { gte: recentSince } } },
      select: { status: true, event: { select: { studentId: true } } }
    }),
    // Rapports d'étape : dernière soumission + rapports « à revoir » en attente.
    prisma.progressReport.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, status: true, submittedAt: true }
    }),
    // Notes : tendance sur 60 jours + signal d'activité sur 90 jours.
    prisma.courseNote.findMany({
      where: {
        assignment: { studentId: { in: studentIds } },
        sessionDate: { gte: activitySince }
      },
      select: {
        grade: true,
        sessionDate: true,
        assignment: { select: { studentId: true } }
      }
    }),
    // Retours de mission écrits par l'étudiant lui-même.
    prisma.projectUpdate.groupBy({
      by: ['authorId'],
      where: { authorId: { in: studentIds }, createdAt: { gte: activitySince } },
      _max: { createdAt: true }
    })
  ])

  const buckets = new Map<string, Bucket>(studentIds.map((id) => [id, emptyBucket()]))

  for (const attendance of attendances) {
    // `studentId` est nullable : un événement sans alternant n'est jamais pointé,
    // et ne pèse donc dans le risque d'aucun étudiant.
    const studentId = attendance.event.studentId
    const bucket = studentId ? buckets.get(studentId) : undefined
    if (!bucket) continue
    bucket.sessions += 1
    if (attendance.status === AttendanceStatus.absent) bucket.unexcusedAbsences += 1
    if (attendance.status === AttendanceStatus.retard) bucket.lates += 1
  }

  for (const report of reports) {
    const bucket = buckets.get(report.studentId)
    if (!bucket) continue
    if (report.submittedAt) {
      bucket.lastSubmittedAt = keepLatest(bucket.lastSubmittedAt, report.submittedAt)
    }
    if (report.status === ReportStatus.a_revoir) bucket.reportsToRevise += 1
  }

  for (const note of notes) {
    const bucket = buckets.get(note.assignment.studentId)
    if (!bucket) continue
    bucket.lastActivityAt = keepLatest(bucket.lastActivityAt, note.sessionDate)
    if (note.grade === null) continue
    const grade = Number(note.grade)
    if (Number.isNaN(grade)) continue
    if (note.sessionDate >= recentSince) bucket.gradesRecent.push(grade)
    else if (note.sessionDate >= comparisonSince) bucket.gradesPrevious.push(grade)
  }

  for (const update of updates) {
    const bucket = buckets.get(update.authorId)
    if (!bucket || !update._max.createdAt) continue
    bucket.lastActivityAt = keepLatest(bucket.lastActivityAt, update._max.createdAt)
  }

  for (const [studentId, bucket] of buckets) {
    result.set(studentId, computeRiskScore(toMetrics(bucket, now)))
  }

  return result
}

/**
 * Score de décrochage de tout le réseau d'un tuteur (table TutorStudent),
 * trié du plus risqué au moins risqué.
 */
export async function assessTutorNetworkRisk(
  tutorId: string,
  now: Date = new Date()
): Promise<StudentRiskEntry[]> {
  const links = await prisma.tutorStudent.findMany({
    where: { tutorId },
    select: { student: { select: { id: true, firstName: true, lastName: true } } }
  })
  if (links.length === 0) return []

  const students = links.map((link) => link.student)
  const assessments = await assessStudentsRisk(
    students.map((s) => s.id),
    now
  )

  // Filet de sécurité : un étudiant sans aucune donnée retombe sur le score « à vide ».
  const fallback = computeRiskScore(toMetrics(emptyBucket(), now))

  return students
    .map((student) => {
      const { score, level, reasons } = assessments.get(student.id) ?? fallback
      return { student, score, level, reasons }
    })
    .sort(
      (a, b) =>
        b.score - a.score || a.student.lastName.localeCompare(b.student.lastName, 'fr')
    )
}
