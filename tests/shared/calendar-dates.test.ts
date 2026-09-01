import { describe, expect, it } from 'vitest'
import {
  dayKey,
  eachDay,
  formatRangeTitle,
  isSameDayLocal,
  monthRange,
  parseDayKey,
  stepDate,
  weekRange
} from '~/shared/utils/calendar-dates'

describe('weekRange', () => {
  it('part du lundi et va jusqu\'au dimanche suivant (exclu)', () => {
    // Mardi 18 août 2026
    const { start, end } = weekRange(new Date(2026, 7, 18))
    expect(start.getDay()).toBe(1)
    expect(start.getDate()).toBe(17)
    expect(end.getDay()).toBe(1)
    expect(end.getDate()).toBe(24)
    expect(eachDay({ start, end })).toHaveLength(7)
  })

  it('days=1 retourne le seul jour passé, à minuit', () => {
    const { start, end } = weekRange(new Date(2026, 7, 18, 14, 30), 1)
    expect(start.getHours()).toBe(0)
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000)
  })
})

describe('monthRange', () => {
  it('couvre toujours 42 jours en commençant un lundi', () => {
    const { start, end } = monthRange(new Date(2026, 8, 15)) // septembre 2026
    expect(start.getDay()).toBe(1)
    expect(eachDay({ start, end })).toHaveLength(42)
  })

  it('la grille contient bien le 1er du mois', () => {
    const { start, end } = monthRange(new Date(2026, 8, 15))
    const days = eachDay({ start, end })
    expect(days.some(d => d.getFullYear() === 2026 && d.getMonth() === 8 && d.getDate() === 1)).toBe(true)
  })

  it('le mois de février court reste dans une grille de 42 jours', () => {
    const { start, end } = monthRange(new Date(2026, 1, 10))
    expect(eachDay({ start, end })).toHaveLength(42)
  })
})

describe('stepDate', () => {
  it('avance/recule d\'un jour en vue jour', () => {
    const base = new Date(2026, 7, 18)
    expect(stepDate('day', base, 1).getDate()).toBe(19)
    expect(stepDate('day', base, -1).getDate()).toBe(17)
  })

  it('avance/recule de 7 jours en vue semaine', () => {
    const base = new Date(2026, 7, 18)
    expect(stepDate('week', base, 1).getDate()).toBe(25)
    expect(stepDate('week', base, -1).getDate()).toBe(11)
  })

  it('avance/recule d\'un mois en vue mois', () => {
    const base = new Date(2026, 7, 18)
    expect(stepDate('month', base, 1).getMonth()).toBe(8)
    expect(stepDate('month', base, -1).getMonth()).toBe(6)
  })
})

describe('dayKey / parseDayKey', () => {
  it('fait l\'aller-retour sur une date locale', () => {
    const date = new Date(2026, 8, 1, 13, 45)
    const key = dayKey(date)
    expect(key).toBe('2026-09-01')
    const parsed = parseDayKey(key)
    expect(parsed).not.toBeNull()
    expect(isSameDayLocal(parsed!, date)).toBe(true)
    expect(parsed!.getHours()).toBe(0)
  })

  it('rejette une clé invalide', () => {
    expect(parseDayKey('not-a-date')).toBeNull()
    expect(parseDayKey('2026-02-30')).toBeNull()
  })

  it('conserve deux chiffres constants sur mois/jour à un seul chiffre', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('formatRangeTitle', () => {
  it('vue mois : un seul mois', () => {
    const title = formatRangeTitle('month', new Date(2026, 8, 15))
    expect(title.months).toBe('septembre')
    expect(title.year).toBe('2026')
  })

  it('semaine à cheval sur deux mois du même an', () => {
    // Semaine du lundi 31 août au dimanche 6 septembre 2026
    const title = formatRangeTitle('week', new Date(2026, 8, 2))
    expect(title.months).toBe('août – sept.')
    expect(title.year).toBe('2026')
  })

  it('semaine à cheval sur deux années', () => {
    // Semaine du lundi 28 décembre 2026 au dimanche 3 janvier 2027
    const title = formatRangeTitle('week', new Date(2026, 11, 30))
    expect(title.months).toBe('déc. 2026 – janv.')
    expect(title.year).toBe('2027')
  })

  it('semaine entièrement dans un seul mois', () => {
    const title = formatRangeTitle('week', new Date(2026, 7, 18))
    expect(title.months).toBe('août')
    expect(title.year).toBe('2026')
  })
})
