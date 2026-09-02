import { describe, expect, it } from 'vitest'
import {
  DAY_MINUTES,
  MIN_EVENT_MINUTES,
  PX_PER_MINUTE,
  bucketByDay,
  layoutDay,
  minutesInColumn,
  snapMinutes,
  type LayoutEvent
} from '~/shared/utils/calendar-layout'

const day = new Date(2026, 7, 18)

function iso(hour: number, minute = 0, dayOffset = 0): string {
  return new Date(2026, 7, 18 + dayOffset, hour, minute).toISOString()
}

describe('layoutDay', () => {
  it('deux événements qui se chevauchent prennent chacun 50% de largeur', () => {
    const events: LayoutEvent[] = [
      { id: 'a', start: iso(9), end: iso(10) },
      { id: 'b', start: iso(9, 30), end: iso(10, 30) }
    ]
    const positioned = layoutDay(events, day)
    expect(positioned).toHaveLength(2)
    expect(positioned.every(p => p.width === 50)).toBe(true)
    const lefts = positioned.map(p => p.left).sort((a, b) => a - b)
    expect(lefts).toEqual([0, 50])
  })

  it('un événement de 10 min est peint à MIN_EVENT_MINUTES', () => {
    const events: LayoutEvent[] = [{ id: 'a', start: iso(9), end: iso(9, 10) }]
    const [positioned] = layoutDay(events, day)
    expect(positioned!.height).toBe(MIN_EVENT_MINUTES * PX_PER_MINUTE)
  })

  it('un événement non-chevauchant occupe toute la largeur', () => {
    const events: LayoutEvent[] = [{ id: 'a', start: iso(9), end: iso(10) }]
    const [positioned] = layoutDay(events, day)
    expect(positioned!.left).toBe(0)
    expect(positioned!.width).toBe(100)
  })

  it('un événement à cheval sur minuit est borné au jour', () => {
    // Commence la veille à 22h, finit le lendemain à 2h
    const events: LayoutEvent[] = [{
      id: 'a',
      start: new Date(2026, 7, 17, 22).toISOString(),
      end: new Date(2026, 7, 19, 2).toISOString()
    }]
    const [positioned] = layoutDay(events, day)
    expect(positioned!.top).toBe(0)
    expect(positioned!.height).toBe(DAY_MINUTES * PX_PER_MINUTE)
  })

  it('trois événements qui se chevauchent forment 3 colonnes', () => {
    const events: LayoutEvent[] = [
      { id: 'a', start: iso(9), end: iso(11) },
      { id: 'b', start: iso(9, 30), end: iso(10, 30) },
      { id: 'c', start: iso(10), end: iso(10, 45) }
    ]
    const positioned = layoutDay(events, day)
    expect(positioned.every(p => p.width === 100 / 3)).toBe(true)
  })
})

describe('bucketByDay', () => {
  it('un événement à cheval sur minuit apparaît dans les deux jours', () => {
    const events: LayoutEvent[] = [{
      id: 'a',
      start: new Date(2026, 7, 17, 22).toISOString(),
      end: new Date(2026, 7, 18, 2).toISOString()
    }]
    const buckets = bucketByDay(events)
    expect(buckets.get('2026-08-17')).toHaveLength(1)
    expect(buckets.get('2026-08-18')).toHaveLength(1)
  })

  it('une fin pile à minuit ne compte que pour un jour', () => {
    const events: LayoutEvent[] = [{
      id: 'a',
      start: new Date(2026, 7, 18, 20).toISOString(),
      end: new Date(2026, 7, 19, 0, 0, 0).toISOString()
    }]
    const buckets = bucketByDay(events)
    expect(buckets.get('2026-08-18')).toHaveLength(1)
    expect(buckets.has('2026-08-19')).toBe(false)
  })

  it('un événement dans la journée ne va que dans son propre jour', () => {
    const events: LayoutEvent[] = [{ id: 'a', start: iso(9), end: iso(10) }]
    const buckets = bucketByDay(events)
    expect(buckets.size).toBe(1)
    expect(buckets.get('2026-08-18')).toHaveLength(1)
  })

  it('ignore un événement dont la fin ne suit pas le début', () => {
    const events: LayoutEvent[] = [{ id: 'a', start: iso(10), end: iso(9) }]
    expect(bucketByDay(events).size).toBe(0)
  })
})

describe('snapMinutes', () => {
  it('arrondit au pas de 15 minutes le plus proche', () => {
    expect(snapMinutes(7)).toBe(0)
    expect(snapMinutes(8)).toBe(15)
    expect(snapMinutes(22)).toBe(15)
    expect(snapMinutes(23)).toBe(30)
  })
})

describe('minutesInColumn', () => {
  it('mode floor cale sur le créneau, mode nearest arrondit au plus proche', () => {
    // 22 minutes après le haut de la colonne
    const clientY = 22 * PX_PER_MINUTE
    expect(minutesInColumn(clientY, 0, 'floor')).toBe(15)
    expect(minutesInColumn(clientY, 0, 'nearest')).toBe(15)
    const clientY2 = 23 * PX_PER_MINUTE
    expect(minutesInColumn(clientY2, 0, 'floor')).toBe(15)
    expect(minutesInColumn(clientY2, 0, 'nearest')).toBe(30)
  })

  it('borne au jour, sans dépasser en dessous ou au-dessus', () => {
    expect(minutesInColumn(-1000, 0, 'nearest')).toBe(0)
    expect(minutesInColumn(1_000_000, 0, 'nearest')).toBe(DAY_MINUTES)
  })

  it('tient compte du décalage du haut du rectangle', () => {
    const rectTop = 100
    const clientY = rectTop + 30 * PX_PER_MINUTE
    expect(minutesInColumn(clientY, rectTop, 'nearest')).toBe(30)
  })
})
