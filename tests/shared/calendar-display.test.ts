import { describe, expect, it } from 'vitest'
import {
  toCalendarCategory,
  toDisplayEvent,
  toDisplayEvents,
  type ApiCalendarEvent
} from '~/shared/utils/calendar-display'

const baseFreeEvent: ApiCalendarEvent = {
  id: 'e1',
  studentId: 's1',
  tutorId: 't1',
  title: 'RDV de suivi',
  startTime: '2026-05-18T08:00:00Z',
  endTime: '2026-05-18T09:00:00Z',
  courseAssignmentId: null,
  courseAssignment: null
}

const baseCourseEvent: ApiCalendarEvent = {
  id: 'e2',
  studentId: 's1',
  tutorId: 't1',
  title: 'Session',
  startTime: '2026-05-18T10:00:00Z',
  endTime: '2026-05-18T12:00:00Z',
  courseAssignmentId: 'a1',
  courseAssignment: { id: 'a1', course: { id: 'c1', title: 'Mathématiques' } }
}

const baseVisitEvent: ApiCalendarEvent = {
  ...baseFreeEvent,
  id: 'e3',
  title: 'Visite en entreprise'
}

describe('toDisplayEvent', () => {
  it('uses the course title when the event is linked to a session', () => {
    const out = toDisplayEvent(baseCourseEvent)
    expect(out.title).toBe('Mathématiques')
    expect(out.calendarId).toBe('session')
  })

  it('falls back to the event title for free events', () => {
    const out = toDisplayEvent(baseFreeEvent)
    expect(out.title).toBe('RDV de suivi')
    expect(out.calendarId).toBe('autre')
  })

  it('keeps the raw event accessible for the click handler', () => {
    const out = toDisplayEvent(baseCourseEvent)
    expect(out.rawEvent.id).toBe('e2')
    expect(out.rawEvent.courseAssignmentId).toBe('a1')
  })

  it('passes start and end through unchanged', () => {
    const out = toDisplayEvent(baseCourseEvent)
    expect(out.start).toBe('2026-05-18T10:00:00Z')
    expect(out.end).toBe('2026-05-18T12:00:00Z')
  })
})

describe('toCalendarCategory', () => {
  it('maps course sessions, visits and free events to distinct categories', () => {
    expect(toCalendarCategory(baseCourseEvent)).toBe('session')
    expect(toCalendarCategory(baseVisitEvent)).toBe('visite')
    expect(toCalendarCategory(baseFreeEvent)).toBe('autre')
  })

  it('detects visits regardless of case', () => {
    expect(toCalendarCategory({ ...baseFreeEvent, title: 'VISITE annuelle' })).toBe('visite')
  })

  it('keeps a course session in its category even if its title mentions a visit', () => {
    expect(toCalendarCategory({ ...baseCourseEvent, title: 'Visite du labo' })).toBe('session')
  })
})

describe('toDisplayEvents', () => {
  it('maps every event in the list', () => {
    expect(toDisplayEvents([baseFreeEvent, baseCourseEvent, baseVisitEvent])).toHaveLength(3)
  })
})
