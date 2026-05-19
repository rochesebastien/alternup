export interface ApiCalendarEvent {
  id: string
  studentId: string
  tutorId: string
  title: string
  startTime: string
  endTime: string
  courseAssignmentId: string | null
  courseAssignment?: {
    id: string
    course: { id: string; title: string }
  } | null
}

export interface FullCalendarInput {
  id: string
  title: string
  start: string
  end: string
  backgroundColor: string
  borderColor: string
  extendedProps: {
    isCourseSession: boolean
    courseAssignmentId: string | null
    rawEvent: ApiCalendarEvent
  }
}

const COURSE_COLOR = '#10b981'
const FREE_EVENT_COLOR = '#6b7280'

export function toFullCalendarEvent(event: ApiCalendarEvent): FullCalendarInput {
  const isCourse = event.courseAssignmentId !== null
  const title = event.courseAssignment?.course.title ?? event.title
  return {
    id: event.id,
    title,
    start: event.startTime,
    end: event.endTime,
    backgroundColor: isCourse ? COURSE_COLOR : FREE_EVENT_COLOR,
    borderColor: isCourse ? COURSE_COLOR : FREE_EVENT_COLOR,
    extendedProps: {
      isCourseSession: isCourse,
      courseAssignmentId: event.courseAssignmentId,
      rawEvent: event
    }
  }
}

export function toFullCalendarEvents(events: ApiCalendarEvent[]): FullCalendarInput[] {
  return events.map(toFullCalendarEvent)
}
