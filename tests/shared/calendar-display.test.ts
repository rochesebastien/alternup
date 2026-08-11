import { describe, expect, it } from 'vitest'
import {
  presenceEntriesToDisplayEvents,
  presenceToDisplayEvent,
  toCalendarCategory,
  toDisplayEvent,
  toDisplayEvents,
  type ApiCalendarEvent
} from '~/shared/utils/calendar-display'
import type { PresenceEntry } from '~/shared/utils/presence-entries'

const baseFreeEvent: ApiCalendarEvent = {
  id: 'e1',
  studentId: 's1',
  tutorId: 't1',
  title: 'RDV de suivi',
  startTime: '2026-05-18T08:00:00Z',
  endTime: '2026-05-18T09:00:00Z',
  courseAssignmentId: null,
  presenceRequired: false,
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
  presenceRequired: false,
  courseAssignment: { id: 'a1', course: { id: 'c1', title: 'Mathématiques' } }
}

const baseVisitEvent: ApiCalendarEvent = {
  ...baseFreeEvent,
  id: 'e3',
  title: 'Visite en entreprise'
}

describe('toDisplayEvent', () => {
  it("affiche le titre du cours pour une session", () => {
    const out = toDisplayEvent(baseCourseEvent)
    expect(out.title).toBe('Mathématiques')
    expect(out.calendarId).toBe('session')
  })

  it("retombe sur le titre de l'événement pour un événement libre", () => {
    const out = toDisplayEvent(baseFreeEvent)
    expect(out.title).toBe('RDV de suivi')
    expect(out.calendarId).toBe('autre')
  })

  it("conserve l'événement brut, lu par le gestionnaire de clic", () => {
    const out = toDisplayEvent(baseCourseEvent)
    expect(out.rawEvent.id).toBe('e2')
    expect(out.rawEvent.courseAssignmentId).toBe('a1')
  })

  it("laisse les dates de début et de fin inchangées", () => {
    const out = toDisplayEvent(baseCourseEvent)
    expect(out.start).toBe('2026-05-18T10:00:00Z')
    expect(out.end).toBe('2026-05-18T12:00:00Z')
  })
})

describe('toCalendarCategory', () => {
  it("classe sessions, visites et événements libres dans des catégories distinctes", () => {
    expect(toCalendarCategory(baseCourseEvent)).toBe('session')
    expect(toCalendarCategory(baseVisitEvent)).toBe('visite')
    expect(toCalendarCategory(baseFreeEvent)).toBe('autre')
  })

  it("reconnaît une visite quelle que soit la casse", () => {
    expect(toCalendarCategory({ ...baseFreeEvent, title: 'VISITE annuelle' })).toBe('visite')
  })

  it("garde une session dans sa catégorie même si son titre parle de visite", () => {
    expect(toCalendarCategory({ ...baseCourseEvent, title: 'Visite du labo' })).toBe('session')
  })
})

describe('toDisplayEvents', () => {
  it("projette chaque événement de la liste", () => {
    expect(toDisplayEvents([baseFreeEvent, baseCourseEvent, baseVisitEvent])).toHaveLength(3)
  })
})

const baseEntry: PresenceEntry = {
  id: 'p1',
  studentId: 's1',
  date: '2026-08-11',
  startTime: '09:00',
  endTime: '17:30',
  minutes: 510,
  kind: 'entreprise_sur_site',
  recordedBy: null,
  student: { id: 's1', firstName: 'Eddy-Marie', lastName: 'Nono' },
  revisionCount: 1,
  locked: true
}

describe('presenceToDisplayEvent', () => {
  it("convertit jour + horaires en instants à l'heure de pendule locale", () => {
    const out = presenceToDisplayEvent(baseEntry, 's1')
    const start = new Date(out.start)
    const end = new Date(out.end)
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(7) // août = index 7
    expect(start.getDate()).toBe(11)
    expect(start.getHours()).toBe(9)
    expect(start.getMinutes()).toBe(0)
    expect(end.getHours()).toBe(17)
    expect(end.getMinutes()).toBe(30)
  })

  it("affiche le seul libellé court pour son propre pointage", () => {
    const out = presenceToDisplayEvent(baseEntry, 's1')
    expect(out.title).toBe('Sur site')
  })

  it("préfixe du prénom de l'apprenant côté tuteur", () => {
    const out = presenceToDisplayEvent(baseEntry, 'tutor-1')
    expect(out.title).toBe('Eddy-Marie · Sur site')
  })

  it("retombe sur le libellé court quand l'apprenant n'est pas chargé", () => {
    const out = presenceToDisplayEvent({ ...baseEntry, student: undefined }, 'tutor-1')
    expect(out.title).toBe('Sur site')
  })

  it("reprend le type de journée dans le libellé court", () => {
    expect(presenceToDisplayEvent({ ...baseEntry, kind: 'entreprise_teletravail' }, 's1').title).toBe('Télétravail')
    expect(presenceToDisplayEvent({ ...baseEntry, kind: 'entreprise_conges' }, 's1').title).toBe('Congés')
    expect(presenceToDisplayEvent({ ...baseEntry, kind: 'ecole_formation' }, 's1').title).toBe('Formation')
  })

  it("marque la catégorie « presence » et un identifiant sans collision", () => {
    const out = presenceToDisplayEvent(baseEntry, 's1')
    expect(out.calendarId).toBe('presence')
    expect(out.id).toBe('presence-p1')
    expect(out.rawEvent).toBe(baseEntry)
  })
})

describe('presenceEntriesToDisplayEvents', () => {
  it("projette chaque pointage de la liste", () => {
    const other: PresenceEntry = { ...baseEntry, id: 'p2', date: '2026-08-12' }
    expect(presenceEntriesToDisplayEvents([baseEntry, other], 's1')).toHaveLength(2)
  })
})
