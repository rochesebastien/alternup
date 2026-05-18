import { describe, expect, it } from 'vitest'
import {
  findNoteForSession,
  notionsToString,
  parseNotions,
  sessionDateKey
} from '~/shared/utils/course-notes'

describe('sessionDateKey', () => {
  it('truncates a datetime to the day in UTC', () => {
    expect(sessionDateKey('2026-05-18T08:30:00Z')).toBe('2026-05-18')
    expect(sessionDateKey('2026-05-18T23:59:59Z')).toBe('2026-05-18')
  })

  it('accepts a Date instance', () => {
    expect(sessionDateKey(new Date('2026-05-18T15:00:00Z'))).toBe('2026-05-18')
  })
})

describe('findNoteForSession', () => {
  const notes = [
    {
      id: 'n1',
      assignmentId: 'a1',
      sessionDate: '2026-05-18T00:00:00Z',
      grade: 12,
      comment: null,
      notionsCovered: null
    },
    {
      id: 'n2',
      assignmentId: 'a2',
      sessionDate: '2026-05-18T00:00:00Z',
      grade: null,
      comment: null,
      notionsCovered: null
    }
  ]

  it('matches by assignmentId and same day', () => {
    expect(findNoteForSession(notes, 'a1', '2026-05-18T08:00:00Z')?.id).toBe('n1')
  })

  it('returns null when no match', () => {
    expect(findNoteForSession(notes, 'a1', '2026-05-19T08:00:00Z')).toBeNull()
    expect(findNoteForSession(notes, 'a3', '2026-05-18T08:00:00Z')).toBeNull()
  })
})

describe('parseNotions', () => {
  it('splits a comma list, trims and dedupes', () => {
    expect(parseNotions('Algèbre, Géométrie, Algèbre')).toEqual(['Algèbre', 'Géométrie'])
  })

  it('drops empty entries', () => {
    expect(parseNotions(' , Logique, , ')).toEqual(['Logique'])
  })

  it('returns an empty array for empty input', () => {
    expect(parseNotions('')).toEqual([])
    expect(parseNotions('   ')).toEqual([])
  })
})

describe('notionsToString', () => {
  it('renders an array of strings joined by ", "', () => {
    expect(notionsToString(['A', 'B'])).toBe('A, B')
  })

  it('ignores non-string and empty entries', () => {
    expect(notionsToString(['A', '', '  ', 42, null])).toBe('A')
  })

  it('returns empty for non-array values', () => {
    expect(notionsToString(null)).toBe('')
    expect(notionsToString({})).toBe('')
    expect(notionsToString('A, B')).toBe('')
  })
})
