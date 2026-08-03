import { describe, expect, it } from 'vitest'
import {
  NOTIFICATION_META,
  REPORT_DUE_AFTER_DAYS,
  REVIEW_PENDING_AFTER_DAYS,
  VISIT_SOON_WITHIN_HOURS,
  feedItemIcon,
  feedItemLabel,
  isReportOverdue,
  isReviewOverdue,
  isVisitSoon,
  learnerReminders,
  relativeTimeFr,
  toDate,
  tutorReminders
} from '~/shared/utils/notifications'

const NOW = new Date('2026-07-28T12:00:00.000Z')
const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000

function hoursFromNow(hours: number): Date {
  return new Date(NOW.getTime() + hours * HOUR_MS)
}

function daysBeforeNow(days: number): Date {
  return new Date(NOW.getTime() - days * DAY_MS)
}

describe('feedItemLabel / feedItemIcon', () => {
  it('expose un libellé français et une icône lucide pour chaque type', () => {
    for (const [type, meta] of Object.entries(NOTIFICATION_META)) {
      expect(meta.label.length).toBeGreaterThan(0)
      expect(meta.icon.startsWith('i-lucide-')).toBe(true)
      expect(feedItemLabel(type)).toBe(meta.label)
      expect(feedItemIcon(type)).toBe(meta.icon)
    }
  })

  it('retombe sur un défaut neutre pour un type inconnu', () => {
    expect(feedItemLabel('type_inexistant')).toBe('Notification')
    expect(feedItemIcon('type_inexistant')).toBe('i-lucide-bell')
  })
})

describe('toDate', () => {
  it('normalise ISO, Date, null et valeur invalide', () => {
    expect(toDate(null)).toBeNull()
    expect(toDate(undefined)).toBeNull()
    expect(toDate('pas une date')).toBeNull()
    expect(toDate(NOW)).toEqual(NOW)
    expect(toDate('2026-07-28T12:00:00.000Z')).toEqual(NOW)
  })
})

describe('isReportOverdue', () => {
  it('relance quand aucun rapport n’a jamais été soumis', () => {
    expect(isReportOverdue(null, NOW)).toBe(true)
  })

  it('ne relance pas dans la fenêtre de 30 jours (bornes incluses)', () => {
    expect(isReportOverdue(daysBeforeNow(0), NOW)).toBe(false)
    expect(isReportOverdue(daysBeforeNow(29), NOW)).toBe(false)
    expect(isReportOverdue(daysBeforeNow(REPORT_DUE_AFTER_DAYS), NOW)).toBe(false)
  })

  it('relance dès que la fenêtre de 30 jours est dépassée', () => {
    expect(isReportOverdue(new Date(daysBeforeNow(REPORT_DUE_AFTER_DAYS).getTime() - 1), NOW)).toBe(true)
    expect(isReportOverdue(daysBeforeNow(45), NOW)).toBe(true)
  })
})

describe('isVisitSoon', () => {
  it('couvre la fenêtre [maintenant, +48 h]', () => {
    expect(isVisitSoon(NOW, NOW)).toBe(true)
    expect(isVisitSoon(hoursFromNow(1), NOW)).toBe(true)
    expect(isVisitSoon(hoursFromNow(VISIT_SOON_WITHIN_HOURS), NOW)).toBe(true)
  })

  it('exclut les visites passées et celles au-delà de 48 h', () => {
    expect(isVisitSoon(hoursFromNow(-1), NOW)).toBe(false)
    expect(isVisitSoon(hoursFromNow(VISIT_SOON_WITHIN_HOURS + 1), NOW)).toBe(false)
  })
})

describe('isReviewOverdue', () => {
  it('relance uniquement au-delà de 7 jours d’attente', () => {
    expect(isReviewOverdue(daysBeforeNow(1), NOW)).toBe(false)
    expect(isReviewOverdue(daysBeforeNow(REVIEW_PENDING_AFTER_DAYS), NOW)).toBe(false)
    expect(isReviewOverdue(daysBeforeNow(REVIEW_PENDING_AFTER_DAYS + 1), NOW)).toBe(true)
  })
})

describe('relativeTimeFr', () => {
  it('formate le passé', () => {
    expect(relativeTimeFr(new Date(NOW.getTime() - 30_000), NOW)).toBe("à l'instant")
    expect(relativeTimeFr(new Date(NOW.getTime() - 5 * 60_000), NOW)).toBe('il y a 5 min')
    expect(relativeTimeFr(new Date(NOW.getTime() - 3 * HOUR_MS), NOW)).toBe('il y a 3 h')
    expect(relativeTimeFr(daysBeforeNow(1), NOW)).toBe('il y a 1 jour')
    expect(relativeTimeFr(daysBeforeNow(3), NOW)).toBe('il y a 3 jours')
    expect(relativeTimeFr(daysBeforeNow(14), NOW)).toBe('il y a 2 semaines')
    expect(relativeTimeFr(daysBeforeNow(60), NOW)).toBe('il y a 2 mois')
    expect(relativeTimeFr(daysBeforeNow(400), NOW)).toBe('il y a 1 an')
  })

  it('formate le futur', () => {
    expect(relativeTimeFr(hoursFromNow(12), NOW)).toBe('dans 12 h')
    expect(relativeTimeFr(new Date(NOW.getTime() + 2 * DAY_MS), NOW)).toBe('dans 2 jours')
  })

  it('renvoie une chaîne vide pour une date invalide', () => {
    expect(relativeTimeFr('pas une date', NOW)).toBe('')
  })
})

describe('learnerReminders', () => {
  it('relance sur le rapport quand aucun n’a été soumis', () => {
    const items = learnerReminders({ lastSubmittedReportAt: null, visits: [] }, NOW)
    expect(items).toHaveLength(1)
    expect(items[0]!.type).toBe('relance_rapport')
    expect(items[0]!.reminder).toBe(true)
    expect(items[0]!.link).toBe('/rapports')
    expect(items[0]!.body).toContain('aucun rapport')
  })

  it('ne relance pas sur un rapport soumis récemment', () => {
    const items = learnerReminders(
      { lastSubmittedReportAt: daysBeforeNow(5), visits: [] },
      NOW
    )
    expect(items).toHaveLength(0)
  })

  it('rappelle uniquement les visites dans les 48 h', () => {
    const items = learnerReminders(
      {
        lastSubmittedReportAt: daysBeforeNow(2),
        visits: [
          { id: 'v1', scheduledAt: hoursFromNow(12), personName: 'Marie Curie' },
          { id: 'v2', scheduledAt: hoursFromNow(72), personName: 'Alan Turing' },
          { id: 'v3', scheduledAt: hoursFromNow(-3), personName: 'Ada Lovelace' }
        ]
      },
      NOW
    )
    expect(items).toHaveLength(1)
    expect(items[0]!.id).toBe('relance:visite:v1')
    expect(items[0]!.type).toBe('relance_visite')
    expect(items[0]!.body).toBe('Visite avec Marie Curie dans 12 h.')
  })

  it('ignore une date de visite invalide', () => {
    const items = learnerReminders(
      {
        lastSubmittedReportAt: daysBeforeNow(2),
        visits: [{ id: 'v1', scheduledAt: 'jamais', personName: 'Marie Curie' }]
      },
      NOW
    )
    expect(items).toHaveLength(0)
  })

  it('place la relance de rapport avant les rappels de visite', () => {
    const items = learnerReminders(
      {
        lastSubmittedReportAt: null,
        visits: [{ id: 'v1', scheduledAt: hoursFromNow(2), personName: 'Marie Curie' }]
      },
      NOW
    )
    expect(items.map((i) => i.type)).toEqual(['relance_rapport', 'relance_visite'])
  })
})

describe('tutorReminders', () => {
  it('agrège les rapports en attente depuis plus de 7 jours', () => {
    const items = tutorReminders(
      {
        pendingReviews: [
          { id: 'r1', studentName: 'Marie Curie', submittedAt: daysBeforeNow(10) },
          { id: 'r2', studentName: 'Alan Turing', submittedAt: daysBeforeNow(9) },
          { id: 'r3', studentName: 'Ada Lovelace', submittedAt: daysBeforeNow(2) }
        ],
        visits: []
      },
      NOW
    )
    expect(items).toHaveLength(1)
    expect(items[0]!.type).toBe('relance_revue')
    expect(items[0]!.title).toBe('2 rapports attendent votre relecture')
    expect(items[0]!.body).toContain('Marie Curie, Alan Turing')
    expect(items[0]!.body).not.toContain('Ada Lovelace')
  })

  it('accorde le titre au singulier pour un seul rapport', () => {
    const items = tutorReminders(
      {
        pendingReviews: [
          { id: 'r1', studentName: 'Marie Curie', submittedAt: daysBeforeNow(30) }
        ],
        visits: []
      },
      NOW
    )
    expect(items[0]!.title).toBe('Un rapport attend votre relecture')
  })

  it('tronque la liste des noms au-delà de trois étudiants', () => {
    const items = tutorReminders(
      {
        pendingReviews: ['A A', 'B B', 'C C', 'D D', 'E E'].map((studentName, i) => ({
          id: `r${i}`,
          studentName,
          submittedAt: daysBeforeNow(10)
        })),
        visits: []
      },
      NOW
    )
    expect(items[0]!.body).toContain('A A, B B, C C et 2 autres')
  })

  it('ne produit rien quand tout est à jour', () => {
    const items = tutorReminders(
      {
        pendingReviews: [
          { id: 'r1', studentName: 'Marie Curie', submittedAt: daysBeforeNow(3) }
        ],
        visits: [{ id: 'v1', scheduledAt: hoursFromNow(96), personName: 'Marie Curie' }]
      },
      NOW
    )
    expect(items).toHaveLength(0)
  })

  it('ignore un rapport sans date de soumission exploitable', () => {
    const items = tutorReminders(
      {
        pendingReviews: [{ id: 'r1', studentName: 'Marie Curie', submittedAt: 'jamais' }],
        visits: []
      },
      NOW
    )
    expect(items).toHaveLength(0)
  })
})
