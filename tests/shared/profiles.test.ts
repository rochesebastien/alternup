import { describe, expect, it } from 'vitest'
import {
  LEARNER_ROLES,
  isLearnerRole,
  profileCreateSchema,
  profileListQuerySchema,
  profileUpdateSchema
} from '~/shared/utils/profiles'

describe('isLearnerRole', () => {
  it.each(LEARNER_ROLES)('accepte %s', (role) => {
    expect(isLearnerRole(role)).toBe(true)
  })

  it.each(['Tutor', 'Admin', ''])('refuse %s', (role) => {
    expect(isLearnerRole(role)).toBe(false)
  })
})

describe('profileCreateSchema', () => {
  const valid = {
    email: '  Alice@Example.COM ',
    password: 'motdepasse',
    firstName: ' Alice ',
    lastName: 'Martin'
  }

  it('normalise email et noms, et applique le rôle Alternant par défaut', () => {
    const result = profileCreateSchema.safeParse(valid)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.email).toBe('alice@example.com')
    expect(result.data.firstName).toBe('Alice')
    expect(result.data.role).toBe('Alternant')
  })

  it('accepte le rôle Stagiaire', () => {
    const result = profileCreateSchema.safeParse({ ...valid, role: 'Stagiaire' })
    expect(result.success).toBe(true)
  })

  it('refuse la création d\'un compte Tutor', () => {
    expect(profileCreateSchema.safeParse({ ...valid, role: 'Tutor' }).success).toBe(false)
  })

  it('refuse un mot de passe trop court', () => {
    expect(profileCreateSchema.safeParse({ ...valid, password: 'court' }).success).toBe(false)
  })

  it('refuse un e-mail invalide', () => {
    expect(profileCreateSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false)
  })
})

describe('profileUpdateSchema', () => {
  it('accepte une mise à jour partielle', () => {
    const result = profileUpdateSchema.safeParse({ firstName: 'Bob' })
    expect(result.success).toBe(true)
  })

  it('ignore le rôle envoyé dans le corps', () => {
    const result = profileUpdateSchema.safeParse({ firstName: 'Bob', role: 'Tutor' })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect('role' in result.data).toBe(false)
  })

  it('refuse un corps vide', () => {
    expect(profileUpdateSchema.safeParse({}).success).toBe(false)
  })
})

describe('profileListQuerySchema', () => {
  it('accepte un filtre de rôle connu', () => {
    expect(profileListQuerySchema.safeParse({ role: 'Stagiaire' }).success).toBe(true)
  })

  it('accepte une requête sans filtre', () => {
    expect(profileListQuerySchema.safeParse({}).success).toBe(true)
  })

  it('refuse un rôle inconnu', () => {
    expect(profileListQuerySchema.safeParse({ role: 'Admin' }).success).toBe(false)
  })
})
