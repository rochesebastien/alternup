// Centre de notifications & relances automatiques.
//
// Module PUR : aucune dépendance Prisma / runtime serveur. Deux familles d'items
// cohabitent dans le fil de l'utilisateur :
//
//   1. les NOTIFICATIONS, persistées en base (table `notifications`), émises par
//      les événements de l'application (annonce, rapport, bulletin, visite, message) ;
//   2. les RELANCES, recalculées à la volée à chaque lecture et jamais stockées :
//      elles décrivent un état courant (« rapport à rédiger », « visite dans 12 h »)
//      qui doit disparaître dès que l'échéance est traitée. Les persister
//      obligerait à les invalider à la main partout.
//
// Ce fichier contient les libellés, icônes et TOUTE la logique de fenêtre des
// relances, pour qu'elle soit testable sans base de données.

import { z } from 'zod'

// ─────────────────────────── Types d'items ───────────────────────────

/** Types persistés en base (colonne `type` de `notifications`). */
export type NotificationType =
  | 'annonce'
  | 'rapport_soumis'
  | 'rapport_valide'
  | 'rapport_a_revoir'
  | 'bulletin_publie'
  | 'visite_planifiee'
  | 'message'
  | 'document_signe'

/** Types calculés à la volée, jamais persistés. */
export type ReminderType = 'relance_rapport' | 'relance_visite' | 'relance_revue'

export type FeedItemType = NotificationType | ReminderType

export interface FeedItemMeta {
  label: string
  /** Nom d'icône `i-lucide-*`. */
  icon: string
}

export const NOTIFICATION_META: Record<FeedItemType, FeedItemMeta> = {
  annonce: { label: 'Annonce', icon: 'i-lucide-megaphone' },
  rapport_soumis: { label: 'Rapport soumis', icon: 'i-lucide-file-up' },
  rapport_valide: { label: 'Rapport validé', icon: 'i-lucide-file-check' },
  rapport_a_revoir: { label: 'Rapport à revoir', icon: 'i-lucide-file-warning' },
  bulletin_publie: { label: 'Bulletin publié', icon: 'i-lucide-graduation-cap' },
  visite_planifiee: { label: 'Visite planifiée', icon: 'i-lucide-map-pin' },
  message: { label: 'Message', icon: 'i-lucide-mail' },
  document_signe: { label: 'Signature', icon: 'i-lucide-pen-line' },
  relance_rapport: { label: 'Relance', icon: 'i-lucide-clock' },
  relance_visite: { label: 'Rappel', icon: 'i-lucide-calendar-clock' },
  relance_revue: { label: 'Relance', icon: 'i-lucide-inbox' }
}

const FALLBACK_META: FeedItemMeta = { label: 'Notification', icon: 'i-lucide-bell' }

/**
 * Métadonnées d'affichage d'un type. La colonne `type` étant une String libre,
 * un type inconnu (ancienne notification, futur module) retombe sur un défaut
 * neutre plutôt que de casser le rendu.
 */
export function feedItemMeta(type: string): FeedItemMeta {
  return NOTIFICATION_META[type as FeedItemType] ?? FALLBACK_META
}

export function feedItemLabel(type: string): string {
  return feedItemMeta(type).label
}

export function feedItemIcon(type: string): string {
  return feedItemMeta(type).icon
}

// ─────────────────────────── Fenêtres de relance ───────────────────────────

const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

/** Au-delà de ce délai sans rapport soumis, l'alternant est relancé. */
export const REPORT_DUE_AFTER_DAYS = 30
/** Une visite planifiée dans moins de ce délai déclenche un rappel. */
export const VISIT_SOON_WITHIN_HOURS = 48
/** Un rapport soumis non relu depuis ce délai relance le tuteur. */
export const REVIEW_PENDING_AFTER_DAYS = 7

/** Normalise une date d'entrée (ISO ou Date). `null` si absente ou invalide. */
export function toDate(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Vrai si l'alternant doit rédiger un rapport d'étape : aucun rapport soumis à
 * ce jour, ou dernier rapport soumis il y a plus de 30 jours.
 */
export function isReportOverdue(lastSubmittedAt: Date | null, now: Date): boolean {
  if (lastSubmittedAt === null) return true
  return now.getTime() - lastSubmittedAt.getTime() > REPORT_DUE_AFTER_DAYS * DAY_MS
}

/** Vrai si la visite est à venir dans moins de 48 h (une visite passée ne relance pas). */
export function isVisitSoon(scheduledAt: Date, now: Date): boolean {
  const delta = scheduledAt.getTime() - now.getTime()
  return delta >= 0 && delta <= VISIT_SOON_WITHIN_HOURS * HOUR_MS
}

/** Vrai si un rapport soumis attend sa relecture depuis plus de 7 jours. */
export function isReviewOverdue(submittedAt: Date, now: Date): boolean {
  return now.getTime() - submittedAt.getTime() > REVIEW_PENDING_AFTER_DAYS * DAY_MS
}

// ─────────────────────────── Dates relatives (FR) ───────────────────────────

function plural(count: number, singular: string, pluralForm: string): string {
  return count > 1 ? pluralForm : singular
}

/**
 * Date relative en français, passée ou future : « à l'instant », « il y a 3 h »,
 * « dans 2 jours ». Pure et déterministe (aucun appel à `Date.now()`).
 */
export function relativeTimeFr(value: string | Date, now: Date): string {
  const date = toDate(value)
  if (date === null) return ''

  const deltaMs = date.getTime() - now.getTime()
  const future = deltaMs > 0
  const abs = Math.abs(deltaMs)

  const wrap = (text: string): string => (future ? `dans ${text}` : `il y a ${text}`)

  const minutes = Math.floor(abs / 60_000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return wrap(`${minutes} min`)

  const hours = Math.floor(abs / HOUR_MS)
  if (hours < 24) return wrap(`${hours} h`)

  const days = Math.floor(abs / DAY_MS)
  if (days < 7) return wrap(`${days} ${plural(days, 'jour', 'jours')}`)
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return wrap(`${weeks} ${plural(weeks, 'semaine', 'semaines')}`)
  }
  if (days < 365) {
    const months = Math.floor(days / 30)
    return wrap(`${months} mois`)
  }
  const years = Math.floor(days / 365)
  return wrap(`${years} ${plural(years, 'an', 'ans')}`)
}

// ─────────────────────────── Construction des relances ───────────────────────────

export interface ReminderItem {
  /** Identifiant stable, non persisté (sert de clé de rendu). */
  id: string
  type: ReminderType
  title: string
  body: string | null
  link: string | null
  createdAt: string
  /** Discriminant vis-à-vis des notifications persistées. */
  reminder: true
}

/** Notification persistée, telle que renvoyée par `GET /api/notifications`. */
export interface NotificationItem {
  id: string
  /** Colonne libre en base : voir `NotificationType` pour les valeurs connues. */
  type: string
  title: string
  body: string | null
  link: string | null
  readAt: string | null
  createdAt: string
}

/** Fil complet : notifications persistées + relances recalculées. */
export interface NotificationFeed {
  notifications: NotificationItem[]
  reminders: ReminderItem[]
}

export interface VisitReminderSource {
  id: string
  scheduledAt: string | Date
  /** L'interlocuteur affiché (étudiant côté tuteur, tuteur côté étudiant). */
  personName: string
}

export interface PendingReviewSource {
  id: string
  studentName: string
  submittedAt: string | Date
}

export interface LearnerReminderSource {
  /** Date de soumission du dernier rapport d'étape, `null` si aucun. */
  lastSubmittedReportAt: string | Date | null
  visits: VisitReminderSource[]
}

export interface TutorReminderSource {
  pendingReviews: PendingReviewSource[]
  visits: VisitReminderSource[]
}

/** Rappels de visites imminentes, communs au tuteur et à l'étudiant. */
function visitReminders(visits: VisitReminderSource[], now: Date): ReminderItem[] {
  const items: ReminderItem[] = []
  for (const visit of visits) {
    const scheduledAt = toDate(visit.scheduledAt)
    if (scheduledAt === null || !isVisitSoon(scheduledAt, now)) continue
    items.push({
      id: `relance:visite:${visit.id}`,
      type: 'relance_visite',
      title: 'Visite à venir',
      body: `Visite avec ${visit.personName} ${relativeTimeFr(scheduledAt, now)}.`,
      link: '/visites',
      createdAt: now.toISOString(),
      reminder: true
    })
  }
  return items
}

/** Énumération française de quelques noms, tronquée au-delà de 3. */
function nameList(names: string[]): string {
  const unique = [...new Set(names)]
  if (unique.length <= 3) return unique.join(', ')
  return `${unique.slice(0, 3).join(', ')} et ${unique.length - 3} autre${unique.length - 3 > 1 ? 's' : ''}`
}

/** Relances d'un alternant / stagiaire : rapport à rédiger, visite imminente. */
export function learnerReminders(source: LearnerReminderSource, now: Date): ReminderItem[] {
  const items: ReminderItem[] = []

  const lastSubmittedAt = toDate(source.lastSubmittedReportAt)
  if (isReportOverdue(lastSubmittedAt, now)) {
    items.push({
      id: 'relance:rapport',
      type: 'relance_rapport',
      title: "Rapport d'étape à rédiger",
      body:
        lastSubmittedAt === null
          ? "Vous n'avez encore soumis aucun rapport d'étape."
          : `Votre dernier rapport d'étape a été soumis ${relativeTimeFr(lastSubmittedAt, now)}.`,
      link: '/rapports',
      createdAt: now.toISOString(),
      reminder: true
    })
  }

  return [...items, ...visitReminders(source.visits, now)]
}

/** Relances d'un tuteur : rapports en attente de relecture, visite imminente. */
export function tutorReminders(source: TutorReminderSource, now: Date): ReminderItem[] {
  const items: ReminderItem[] = []

  const overdue = source.pendingReviews.filter((review) => {
    const submittedAt = toDate(review.submittedAt)
    return submittedAt !== null && isReviewOverdue(submittedAt, now)
  })

  if (overdue.length > 0) {
    items.push({
      id: 'relance:revue',
      type: 'relance_revue',
      title:
        overdue.length === 1
          ? 'Un rapport attend votre relecture'
          : `${overdue.length} rapports attendent votre relecture`,
      body: `Soumis depuis plus de ${REVIEW_PENDING_AFTER_DAYS} jours : ${nameList(
        overdue.map((review) => review.studentName)
      )}.`,
      link: '/rapports',
      createdAt: now.toISOString(),
      reminder: true
    })
  }

  return [...items, ...visitReminders(source.visits, now)]
}

// ─────────────────────────── Schémas d'entrée ───────────────────────────

/** Pagination du fil : `take` fixe à 50, décalage optionnel. */
export const NOTIFICATION_PAGE_SIZE = 50

export const notificationListQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).max(5000).optional()
})

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>
