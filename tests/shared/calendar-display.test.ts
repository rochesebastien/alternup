import { describe, expect, it } from 'vitest'
import {
  toFullCalendarEvent,
  toFullCalendarEvents,
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

describe('toFullCalendarEvent', () => {
  it('uses the course title when the event is linked to a session', () => {
    const out = toFullCalendarEvent(baseCourseEvent)
    expect(out.title).toBe('Mathématiques')
    expect(out.extendedProps.isCourseSession).toBe(true)
    expect(out.extendedProps.courseAssignmentId).toBe('a1')
  })

  it('falls back to the event title for free events', () => {
    const out = toFullCalendarEvent(baseFreeEvent)
    expect(out.title).toBe('RDV de suivi')
    expect(out.extendedProps.isCourseSession).toBe(false)
    expect(out.extendedProps.courseAssignmentId).toBeNull()
  })

  it('keeps the raw event accessible for the click handler', () => {
    const out = toFullCalendarEvent(baseCourseEvent)
    expect(out.extendedProps.rawEvent.id).toBe('e2')
  })

  it('passes start and end through unchanged', () => {
    const out = toFullCalendarEvent(baseCourseEvent)
    expect(out.start).toBe('2026-05-18T10:00:00Z')
    expect(out.end).toBe('2026-05-18T12:00:00Z')
  })

  it('uses different colors for course sessions and free events', () => {
    expect(toFullCalendarEvent(baseCourseEvent).backgroundColor).not.toBe(
      toFullCalendarEvent(baseFreeEvent).backgroundColor
    )
  })
})

describe('toFullCalendarEvents', () => {
  it('maps every event in the list', () => {
    expect(toFullCalendarEvents([baseFreeEvent, baseCourseEvent])).toHaveLength(2)
  })
})
