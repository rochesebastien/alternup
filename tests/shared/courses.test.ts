import { describe, expect, it } from 'vitest'
import {
  assignmentRangeIsValid,
  courseAssignmentCreateSchema,
  courseAssignmentUpdateSchema,
  courseCreateSchema,
  courseUpdateSchema
} from '~/shared/utils/courses'

const STUDENT_ID = '11111111-1111-1111-1111-111111111111'
const COURSE_ID = '22222222-2222-2222-2222-222222222222'

describe('assignmentRangeIsValid', () => {
  it('accepte une période cohérente', () => {
    expect(
      assignmentRangeIsValid(new Date('2026-01-01'), new Date('2026-06-30'))
    ).toBe(true)
  })

  it('accepte des bornes égales', () => {
    const d = new Date('2026-01-01')
    expect(assignmentRangeIsValid(d, new Date(d))).toBe(true)
  })

  it('refuse une fin antérieure au début', () => {
    expect(
      assignmentRangeIsValid(new Date('2026-06-30'), new Date('2026-01-01'))
    ).toBe(false)
  })

  it('considère une borne absente comme valide (fusion côté serveur)', () => {
    expect(assignmentRangeIsValid(undefined, new Date('2026-01-01'))).toBe(true)
    expect(assignmentRangeIsValid(new Date('2026-01-01'), null)).toBe(true)
  })
})

describe('courseCreateSchema', () => {
  it('nettoie le titre', () => {
    const result = courseCreateSchema.safeParse({ title: '  Maths  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.title).toBe('Maths')
  })

  it('ignore un createdById envoyé dans le corps', () => {
    const result = courseCreateSchema.safeParse({ title: 'Maths', createdById: STUDENT_ID })
    expect(result.success).toBe(true)
    if (result.success) expect('createdById' in result.data).toBe(false)
  })

  it('refuse un titre vide', () => {
    expect(courseCreateSchema.safeParse({ title: '   ' }).success).toBe(false)
  })
})

describe('courseUpdateSchema', () => {
  it('accepte une mise à jour partielle', () => {
    expect(courseUpdateSchema.safeParse({ description: null }).success).toBe(true)
  })

  it('refuse un corps vide', () => {
    expect(courseUpdateSchema.safeParse({}).success).toBe(false)
  })
})

describe('courseAssignmentCreateSchema', () => {
  const valid = {
    studentId: STUDENT_ID,
    courseId: COURSE_ID,
    startDate: '2026-01-01'
  }

  it('accepte une affectation valide', () => {
    expect(courseAssignmentCreateSchema.safeParse(valid).success).toBe(true)
  })

  it('refuse un identifiant non-UUID', () => {
    expect(
      courseAssignmentCreateSchema.safeParse({ ...valid, studentId: 'abc' }).success
    ).toBe(false)
  })

  it('refuse une période incohérente', () => {
    expect(
      courseAssignmentCreateSchema.safeParse({ ...valid, endDate: '2025-12-01' }).success
    ).toBe(false)
  })
})

describe('courseAssignmentUpdateSchema', () => {
  it('accepte une mise à jour partielle', () => {
    expect(courseAssignmentUpdateSchema.safeParse({ endDate: null }).success).toBe(true)
  })

  it('refuse un corps vide', () => {
    expect(courseAssignmentUpdateSchema.safeParse({}).success).toBe(false)
  })

  it('refuse une période incohérente fournie en entier', () => {
    expect(
      courseAssignmentUpdateSchema.safeParse({
        startDate: '2026-06-30',
        endDate: '2026-01-01'
      }).success
    ).toBe(false)
  })
})
