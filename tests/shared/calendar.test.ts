import { describe, expect, it } from 'vitest'
import {
  calendarEventCreateSchema,
  calendarEventUpdateSchema,
  eventNoteUpsertSchema
} from '~/shared/utils/calendar'

const baseEvent = {
  studentId: '11111111-1111-1111-1111-111111111111',
  title: 'Cours d\'algèbre',
  startTime: '2026-05-18T08:00:00Z',
  endTime: '2026-05-18T10:00:00Z'
}

describe('calendarEventCreateSchema', () => {
  it('accepts a valid event', () => {
    const result = calendarEventCreateSchema.safeParse(baseEvent)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.startTime).toBeInstanceOf(Date)
      expect(result.data.endTime).toBeInstanceOf(Date)
    }
  })

  it('rejects an event where endTime <= startTime', () => {
    expect(
      calendarEventCreateSchema.safeParse({
        ...baseEvent,
        endTime: baseEvent.startTime
      }).success
    ).toBe(false)
  })

  it('rejects an empty title', () => {
    expect(
      calendarEventCreateSchema.safeParse({ ...baseEvent, title: '   ' }).success
    ).toBe(false)
  })

  it('accepts a nullable courseAssignmentId', () => {
    expect(
      calendarEventCreateSchema.safeParse({ ...baseEvent, courseAssignmentId: null })
        .success
    ).toBe(true)
  })

  it('rejects an invalid courseAssignmentId', () => {
    expect(
      calendarEventCreateSchema.safeParse({ ...baseEvent, courseAssignmentId: 'bad' })
        .success
    ).toBe(false)
  })
})

describe('calendarEventUpdateSchema', () => {
  it('rejects an empty body', () => {
    expect(calendarEventUpdateSchema.safeParse({}).success).toBe(false)
  })

  it('accepts a single-field update', () => {
    expect(
      calendarEventUpdateSchema.safeParse({ title: 'New title' }).success
    ).toBe(true)
  })

  it('rejects start/end swap when both provided', () => {
    expect(
      calendarEventUpdateSchema.safeParse({
        startTime: '2026-05-18T10:00:00Z',
        endTime: '2026-05-18T08:00:00Z'
      }).success
    ).toBe(false)
  })

  it('allows a partial time update (only startTime)', () => {
    expect(
      calendarEventUpdateSchema.safeParse({ startTime: '2026-05-18T08:00:00Z' })
        .success
    ).toBe(true)
  })
})

describe('eventNoteUpsertSchema', () => {
  it('accepts an empty body (all optional)', () => {
    expect(eventNoteUpsertSchema.safeParse({}).success).toBe(true)
  })

  it.each([0, 10, 20])('accepts a valid grade %s', (grade) => {
    expect(eventNoteUpsertSchema.safeParse({ grade }).success).toBe(true)
  })

  it.each([-1, 21, 100])('rejects out-of-range grade %s', (grade) => {
    expect(eventNoteUpsertSchema.safeParse({ grade }).success).toBe(false)
  })

  it('coerces numeric grades from strings', () => {
    const result = eventNoteUpsertSchema.safeParse({ grade: '12.5' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.grade).toBe(12.5)
  })

  it('accepts a notionsCovered array of trimmed strings', () => {
    const result = eventNoteUpsertSchema.safeParse({
      notionsCovered: ['Algèbre', 'Géométrie']
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty strings inside notionsCovered', () => {
    expect(
      eventNoteUpsertSchema.safeParse({ notionsCovered: ['', 'ok'] }).success
    ).toBe(false)
  })
})
