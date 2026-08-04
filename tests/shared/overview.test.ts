import { describe, expect, it } from 'vitest'
import {
  OVERVIEW_EVENT_META,
  OVERVIEW_TIMELINE_LIMIT,
  formatGrade20,
  formatPercent,
  mergeTimeline,
  mergeUpcoming,
  overviewEventIcon,
  overviewEventLabel,
  overviewEventMeta,
  overviewUpcomingMeta,
  type OverviewEvent,
  type OverviewEventType,
  type OverviewUpcoming
} from '~/shared/utils/overview'

function evt(id: string, date: string, type: OverviewEventType = 'note'): OverviewEvent {
  return { id, date, type, title: id }
}

function upcoming(id: string, date: string): OverviewUpcoming {
  return { id, date, type: 'session', title: id }
}

describe('overviewEventMeta', () => {
  it('expose un libellé français et une icône lucide pour chaque type', () => {
    const types = Object.keys(OVERVIEW_EVENT_META) as OverviewEventType[]
    expect(types).toHaveLength(7)
    for (const type of types) {
      const meta = overviewEventMeta(type)
      expect(meta.label.length).toBeGreaterThan(0)
      expect(meta.icon.startsWith('i-lucide-')).toBe(true)
    }
    expect(overviewEventLabel('rapport')).toBe("Rapport d'étape")
    expect(overviewEventLabel('retour_mission')).toBe('Retour de mission')
    expect(overviewEventIcon('absence')).toBe('i-lucide-user-x')
  })

  it('retombe sur un défaut neutre pour un type inconnu', () => {
    const meta = overviewEventMeta('inconnu')
    expect(meta.label).toBe('Événement')
    expect(meta.color).toBe('neutral')
  })

  it('couvre aussi les types de la colonne « À venir »', () => {
    expect(overviewUpcomingMeta('visite').label).toBe('Visite')
    expect(overviewUpcomingMeta('session').icon).toBe('i-lucide-calendar-clock')
    expect(overviewUpcomingMeta('autre').label).toBe('Événement')
  })
})

describe('mergeTimeline', () => {
  it('fusionne plusieurs sources du plus récent au plus ancien', () => {
    const merged = mergeTimeline([
      [evt('a', '2026-01-10T10:00:00.000Z')],
      [evt('b', '2026-03-01T08:00:00.000Z'), evt('c', '2026-02-01T08:00:00.000Z')]
    ])
    expect(merged.map((e) => e.id)).toEqual(['b', 'c', 'a'])
  })

  it('ignore les sources vides ou absentes', () => {
    const merged = mergeTimeline([null, undefined, [], [evt('a', '2026-01-01T00:00:00.000Z')]])
    expect(merged.map((e) => e.id)).toEqual(['a'])
  })

  it('écarte les dates invalides sans casser la fusion', () => {
    const merged = mergeTimeline([
      [evt('ko', 'pas-une-date'), evt('ok', '2026-01-01T00:00:00.000Z')]
    ])
    expect(merged.map((e) => e.id)).toEqual(['ok'])
  })

  it('reste déterministe à date égale (tri secondaire sur l\'id)', () => {
    const merged = mergeTimeline([
      [evt('zeta', '2026-01-01T00:00:00.000Z')],
      [evt('alpha', '2026-01-01T00:00:00.000Z')]
    ])
    expect(merged.map((e) => e.id)).toEqual(['alpha', 'zeta'])
  })

  it('tronque au nombre demandé, 50 par défaut', () => {
    const many = Array.from({ length: 80 }, (_, i) =>
      evt(`e${String(i).padStart(2, '0')}`, new Date(2026, 0, 1, i).toISOString())
    )
    expect(mergeTimeline([many])).toHaveLength(OVERVIEW_TIMELINE_LIMIT)
    expect(mergeTimeline([many], 3).map((e) => e.id)).toEqual(['e79', 'e78', 'e77'])
    expect(mergeTimeline([many], 0)).toEqual([])
  })
})

describe('mergeUpcoming', () => {
  it('trie du plus proche au plus lointain et limite à 5 par défaut', () => {
    const items = [
      upcoming('d', '2026-04-04T00:00:00.000Z'),
      upcoming('a', '2026-04-01T00:00:00.000Z'),
      upcoming('c', '2026-04-03T00:00:00.000Z'),
      upcoming('b', '2026-04-02T00:00:00.000Z'),
      upcoming('f', '2026-04-06T00:00:00.000Z'),
      upcoming('e', '2026-04-05T00:00:00.000Z')
    ]
    expect(mergeUpcoming([items]).map((i) => i.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('fusionne visites et sessions et écarte les dates invalides', () => {
    const merged = mergeUpcoming([
      [{ id: 'visite:1', date: '2026-05-02T09:00:00.000Z', type: 'visite', title: 'Visite' }],
      [upcoming('session:1', '2026-05-01T09:00:00.000Z'), upcoming('ko', '')]
    ])
    expect(merged.map((i) => i.id)).toEqual(['session:1', 'visite:1'])
  })
})

describe('formatGrade20 / formatPercent', () => {
  it('formate les notes à la française', () => {
    expect(formatGrade20(14)).toBe('14/20')
    expect(formatGrade20(13.25)).toBe('13,3/20')
    expect(formatGrade20(null)).toBe('-')
    expect(formatGrade20(undefined)).toBe('-')
    expect(formatGrade20(Number.NaN)).toBe('-')
  })

  it('formate les pourcentages avec espace insécable court', () => {
    expect(formatPercent(87)).toBe('87 %')
    expect(formatPercent(86.6)).toBe('87 %')
    expect(formatPercent(null)).toBe('-')
  })
})
