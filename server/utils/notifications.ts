import { ReportStatus, Role, VisitStatus } from '@prisma/client'
import type { User } from '#auth-utils'
import { prisma } from '~/server/utils/prisma'
import {
  VISIT_SOON_WITHIN_HOURS,
  learnerReminders,
  tutorReminders
} from '~/shared/utils/notifications'
import type { NotificationType, ReminderItem } from '~/shared/utils/notifications'

const HOUR_MS = 3_600_000

export interface NotificationPayload {
  type: NotificationType
  title: string
  body?: string | null
  /** Chemin interne vers la page concernée (ex. `/rapports/<id>`). */
  link?: string | null
}

/**
 * Crée une notification pour un utilisateur. BEST EFFORT : une notification qui
 * échoue ne doit jamais faire échouer l'action métier qui l'a déclenchée
 * (soumettre un rapport, envoyer un message…). L'erreur est journalisée.
 */
export async function notifyUser(userId: string, payload: NotificationPayload): Promise<void> {
  await notifyUsers([userId], payload)
}

/** Variante multi-destinataires (annonce diffusée à plusieurs étudiants). */
export async function notifyUsers(
  userIds: string[],
  payload: NotificationPayload
): Promise<void> {
  const targets = [...new Set(userIds)]
  if (targets.length === 0) return

  try {
    await prisma.notification.createMany({
      data: targets.map((userId) => ({
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body ?? null,
        link: payload.link ?? null
      }))
    })
  } catch (error) {
    console.error('[notifications] création impossible', error)
  }
}

/** Extrait court du corps d'un contenu long, pour le body de la notification. */
export function excerpt(text: string, max = 160): string {
  const clean = text.trim().replace(/\s+/g, ' ')
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`
}

function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`
}

/**
 * Relances calculées à la volée pour l'utilisateur connecté (jamais persistées).
 * La fenêtre des visites est filtrée en SQL pour garder la requête légère ; le
 * reste de la logique de fenêtre vit dans `shared/utils/notifications.ts`.
 */
export async function computeReminders(
  user: User,
  now: Date = new Date()
): Promise<ReminderItem[]> {
  const visitWindowEnd = new Date(now.getTime() + VISIT_SOON_WITHIN_HOURS * HOUR_MS)

  if (user.role === Role.Tutor) {
    const [pendingReviews, visits] = await Promise.all([
      prisma.progressReport.findMany({
        where: {
          tutorId: user.id,
          status: ReportStatus.soumis,
          submittedAt: { not: null }
        },
        select: {
          id: true,
          submittedAt: true,
          student: { select: { firstName: true, lastName: true } }
        },
        orderBy: { submittedAt: 'asc' },
        take: 100
      }),
      prisma.tutorVisit.findMany({
        where: {
          tutorId: user.id,
          status: VisitStatus.planifiee,
          scheduledAt: { gte: now, lte: visitWindowEnd }
        },
        select: {
          id: true,
          scheduledAt: true,
          student: { select: { firstName: true, lastName: true } }
        },
        orderBy: { scheduledAt: 'asc' },
        take: 20
      })
    ])

    return tutorReminders(
      {
        pendingReviews: pendingReviews
          .filter((report) => report.submittedAt !== null)
          .map((report) => ({
            id: report.id,
            studentName: fullName(report.student),
            submittedAt: report.submittedAt as Date
          })),
        visits: visits.map((visit) => ({
          id: visit.id,
          scheduledAt: visit.scheduledAt,
          personName: fullName(visit.student)
        }))
      },
      now
    )
  }

  const [lastReport, visits] = await Promise.all([
    prisma.progressReport.findFirst({
      where: { studentId: user.id, submittedAt: { not: null } },
      select: { submittedAt: true },
      orderBy: { submittedAt: 'desc' }
    }),
    prisma.tutorVisit.findMany({
      where: {
        studentId: user.id,
        status: VisitStatus.planifiee,
        scheduledAt: { gte: now, lte: visitWindowEnd }
      },
      select: {
        id: true,
        scheduledAt: true,
        tutor: { select: { firstName: true, lastName: true } }
      },
      orderBy: { scheduledAt: 'asc' },
      take: 20
    })
  ])

  return learnerReminders(
    {
      lastSubmittedReportAt: lastReport?.submittedAt ?? null,
      visits: visits.map((visit) => ({
        id: visit.id,
        scheduledAt: visit.scheduledAt,
        personName: fullName(visit.tutor)
      }))
    },
    now
  )
}
