import { describe, expect, it } from 'vitest'
import {
  formatDuration,
  minutesFromTime,
  presenceEntryDaySchema,
  presenceEntryTutorFormSchema,
  presenceEntryUpsertSchema,
  roundedNowTime,
  startOfWeekKey,
  timeFromMinutes,
  toDateKey,
  totalMinutes
} from '~/shared/utils/presence-entries'

const GUID = '23fd8f00-6c23-4acc-b184-da450759b251'

describe('conversions horaires', () => {
  it.each([
    ['00:00', 0],
    ['09:05', 545],
    ['17:30', 1050],
    ['23:59', 1439]
  ])('minutesFromTime(%s) = %i', (time, minutes) => {
    expect(minutesFromTime(time)).toBe(minutes)
  })

  it('fait l\'aller-retour minutes ↔ HH:MM', () => {
    for (const minutes of [0, 1, 545, 1050, 1439]) {
      expect(minutesFromTime(timeFromMinutes(minutes))).toBe(minutes)
    }
  })

  it('borne les minutes hors journée', () => {
    expect(timeFromMinutes(-10)).toBe('00:00')
    expect(timeFromMinutes(5000)).toBe('23:59')
  })
})

describe('formatDuration', () => {
  it.each([
    [0, '0h'],
    [480, '8h'],
    [455, '7h35'],
    [65, '1h05']
  ])('%i minutes → %s', (minutes, label) => {
    expect(formatDuration(minutes)).toBe(label)
  })
})

describe('repères de dates', () => {
  it('formate un jour local sans repasser en UTC', () => {
    // 23h30 heure locale : `toISOString()` aurait basculé au lendemain à l'est
    // de Greenwich, `toDateKey` doit rester sur le jour affiché à l'écran.
    expect(toDateKey(new Date(2026, 7, 11, 23, 30))).toBe('2026-08-11')
  })

  it('ramène au lundi de la semaine', () => {
    expect(startOfWeekKey(new Date(2026, 7, 11))).toBe('2026-08-10') // mardi → lundi
    expect(startOfWeekKey(new Date(2026, 7, 10))).toBe('2026-08-10') // lundi → lui-même
    expect(startOfWeekKey(new Date(2026, 7, 16))).toBe('2026-08-10') // dimanche → lundi
  })

  it('arrondit l\'heure courante au quart d\'heure inférieur', () => {
    expect(roundedNowTime(new Date(2026, 7, 11, 9, 7))).toBe('09:00')
    expect(roundedNowTime(new Date(2026, 7, 11, 9, 47))).toBe('09:45')
  })
})

describe('totalMinutes', () => {
  it('additionne les journées', () => {
    expect(totalMinutes([{ minutes: 480 }, { minutes: 455 }])).toBe(935)
    expect(totalMinutes([])).toBe(0)
  })
})

describe('presenceEntryDaySchema', () => {
  const valid = { date: '2026-08-11', startTime: '09:00', endTime: '17:30' }

  it('accepte une journée valide', () => {
    expect(presenceEntryDaySchema.safeParse(valid).success).toBe(true)
  })

  it('refuse un départ antérieur à l\'arrivée', () => {
    const result = presenceEntryDaySchema.safeParse({ ...valid, endTime: '08:00' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['endTime'])
  })

  it('refuse un départ égal à l\'arrivée', () => {
    expect(presenceEntryDaySchema.safeParse({ ...valid, endTime: '09:00' }).success).toBe(false)
  })

  it.each(['9:00', '25:00', '09:60', 'midi'])('refuse l\'heure %s', (startTime) => {
    expect(presenceEntryDaySchema.safeParse({ ...valid, startTime }).success).toBe(false)
  })

  it.each(['11/08/2026', '2026-8-11', ''])('refuse la date %s', (date) => {
    expect(presenceEntryDaySchema.safeParse({ ...valid, date }).success).toBe(false)
  })
})

describe('presenceEntryUpsertSchema', () => {
  const valid = { date: '2026-08-11', startTime: '09:00', endTime: '17:30' }

  it('accepte un pointage sans studentId (pour soi-même)', () => {
    expect(presenceEntryUpsertSchema.safeParse(valid).success).toBe(true)
  })

  it('accepte un studentId valide', () => {
    expect(presenceEntryUpsertSchema.safeParse({ ...valid, studentId: GUID }).success).toBe(true)
  })

  it('refuse un studentId qui n\'est pas un identifiant', () => {
    expect(presenceEntryUpsertSchema.safeParse({ ...valid, studentId: 'moi' }).success).toBe(false)
  })
})

describe('presenceEntryTutorFormSchema', () => {
  const valid = { date: '2026-08-11', startTime: '09:00', endTime: '17:30' }

  it('exige la personne pointée', () => {
    expect(presenceEntryTutorFormSchema.safeParse(valid).success).toBe(false)
    expect(presenceEntryTutorFormSchema.safeParse({ ...valid, studentId: '' }).success).toBe(false)
    expect(presenceEntryTutorFormSchema.safeParse({ ...valid, studentId: GUID }).success).toBe(true)
  })
})
