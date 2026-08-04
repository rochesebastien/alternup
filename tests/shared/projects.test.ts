import { describe, expect, it } from 'vitest'
import { ProjectStatus } from '~/shared/utils/enums'
import {
  PROJECT_STATUS_OPTIONS,
  assignmentCreateSchema,
  assignmentUpdateSchema,
  pickStudentEditableFields,
  projectCreateSchema,
  projectStatusColor,
  projectStatusLabel,
  projectUpdateSchema
} from '~/shared/utils/projects'

describe('projectCreateSchema', () => {
  it('accepts a title-only payload', () => {
    const result = projectCreateSchema.safeParse({ title: 'Refonte UI' })
    expect(result.success).toBe(true)
  })

  it('rejects an empty title', () => {
    expect(projectCreateSchema.safeParse({ title: '' }).success).toBe(false)
    expect(projectCreateSchema.safeParse({ title: '   ' }).success).toBe(false)
  })

  it('trims the title', () => {
    const result = projectCreateSchema.safeParse({ title: '  Hello  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.title).toBe('Hello')
  })
})

describe('projectUpdateSchema', () => {
  it('rejects an empty body', () => {
    expect(projectUpdateSchema.safeParse({}).success).toBe(false)
  })

  it('accepts a partial body', () => {
    expect(projectUpdateSchema.safeParse({ internal: false }).success).toBe(true)
  })
})

describe('assignmentCreateSchema', () => {
  const validInput = {
    projectId: '11111111-1111-1111-1111-111111111111',
    studentId: '22222222-2222-2222-2222-222222222222'
  }

  it('accepts a minimal payload', () => {
    expect(assignmentCreateSchema.safeParse(validInput).success).toBe(true)
  })

  it.each(['not-a-uuid', '', ' '])('rejects an invalid projectId (%s)', (id) => {
    expect(
      assignmentCreateSchema.safeParse({ ...validInput, projectId: id }).success
    ).toBe(false)
  })

  it('accepts each valid ProjectStatus', () => {
    for (const status of Object.values(ProjectStatus)) {
      expect(
        assignmentCreateSchema.safeParse({ ...validInput, status }).success
      ).toBe(true)
    }
  })

  it('rejects an unknown status', () => {
    expect(
      assignmentCreateSchema.safeParse({ ...validInput, status: 'unknown' }).success
    ).toBe(false)
  })
})

describe('assignmentUpdateSchema', () => {
  it('rejects an empty body', () => {
    expect(assignmentUpdateSchema.safeParse({}).success).toBe(false)
  })

  it('accepts a status-only update', () => {
    const result = assignmentUpdateSchema.safeParse({ status: ProjectStatus.en_cours })
    expect(result.success).toBe(true)
  })

  it('coerces startedAt to a Date', () => {
    const result = assignmentUpdateSchema.safeParse({ startedAt: '2026-05-18' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.startedAt).toBeInstanceOf(Date)
  })
})

describe('pickStudentEditableFields', () => {
  it('keeps only status and studentComment', () => {
    const out = pickStudentEditableFields({
      status: ProjectStatus.en_cours,
      tutorComment: 'should be dropped',
      studentComment: 'mine'
    })
    expect(out).toEqual({
      status: ProjectStatus.en_cours,
      studentComment: 'mine'
    })
  })

  it('returns an empty object when the input has none of the student fields', () => {
    expect(pickStudentEditableFields({ tutorComment: 'nope' })).toEqual({})
  })
})

describe('projectStatusLabel / projectStatusColor', () => {
  it('returns a French label for every status', () => {
    for (const status of Object.values(ProjectStatus)) {
      const label = projectStatusLabel(status)
      expect(label).toMatch(/^[A-Z]/)
      expect(label.length).toBeGreaterThan(0)
    }
  })

  it('returns a UI color for every status', () => {
    expect(projectStatusColor(ProjectStatus.non_demarre)).toBe('neutral')
    expect(projectStatusColor(ProjectStatus.en_cours)).toBe('primary')
    expect(projectStatusColor(ProjectStatus.termine)).toBe('success')
    expect(projectStatusColor(ProjectStatus.annule)).toBe('error')
  })
})

describe('PROJECT_STATUS_OPTIONS', () => {
  it('contains one option per enum value', () => {
    const values = PROJECT_STATUS_OPTIONS.map((o) => o.value).sort()
    const expected = Object.values(ProjectStatus).sort()
    expect(values).toEqual(expected)
  })
})
