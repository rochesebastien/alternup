export function sessionDateKey(dateInput: Date | string): string {
  const d = new Date(dateInput)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

export interface NoteByAssignmentRef {
  id: string
  assignmentId: string
  sessionDate: string | Date
  grade: number | null
  comment: string | null
  notionsCovered: unknown
}

export function findNoteForSession(
  notes: NoteByAssignmentRef[],
  assignmentId: string,
  startTime: string | Date
): NoteByAssignmentRef | null {
  const target = sessionDateKey(startTime)
  return (
    notes.find(
      (n) => n.assignmentId === assignmentId && sessionDateKey(n.sessionDate) === target
    ) ?? null
  )
}

export function parseNotions(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    )
  )
}

export function notionsToString(notions: unknown): string {
  if (Array.isArray(notions)) {
    return notions.filter((n) => typeof n === 'string' && n.trim() !== '').join(', ')
  }
  return ''
}
