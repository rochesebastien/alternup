import { describe, expect, it } from 'vitest'
import {
  accountPasswordUpdateSchema,
  accountProfileUpdateSchema
} from '~/shared/utils/account'

describe('accountProfileUpdateSchema', () => {
  it('accepte une identité valide et coupe les espaces', () => {
    const result = accountProfileUpdateSchema.safeParse({
      firstName: '  Sébastien ',
      lastName: 'Roche'
    })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ firstName: 'Sébastien', lastName: 'Roche' })
  })

  it.each([
    { firstName: '', lastName: 'Roche' },
    { firstName: '   ', lastName: 'Roche' },
    { firstName: 'Sébastien', lastName: '' },
    { firstName: 'S'.repeat(121), lastName: 'Roche' }
  ])('refuse %o', (payload) => {
    expect(accountProfileUpdateSchema.safeParse(payload).success).toBe(false)
  })

  it('exige les deux champs', () => {
    expect(accountProfileUpdateSchema.safeParse({ firstName: 'Sébastien' }).success).toBe(false)
  })
})

describe('accountPasswordUpdateSchema', () => {
  const valid = {
    currentPassword: 'ancien-mot-de-passe',
    newPassword: 'nouveau-mot-de-passe',
    confirmPassword: 'nouveau-mot-de-passe'
  }

  it('accepte un changement cohérent', () => {
    expect(accountPasswordUpdateSchema.safeParse(valid).success).toBe(true)
  })

  it('refuse une confirmation différente', () => {
    const result = accountPasswordUpdateSchema.safeParse({
      ...valid,
      confirmPassword: 'autre-chose'
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['confirmPassword'])
  })

  it('refuse un nouveau mot de passe trop court', () => {
    expect(
      accountPasswordUpdateSchema.safeParse({
        ...valid,
        newPassword: 'court',
        confirmPassword: 'court'
      }).success
    ).toBe(false)
  })

  it('refuse de réutiliser le mot de passe actuel', () => {
    const result = accountPasswordUpdateSchema.safeParse({
      currentPassword: 'ancien-mot-de-passe',
      newPassword: 'ancien-mot-de-passe',
      confirmPassword: 'ancien-mot-de-passe'
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['newPassword'])
  })

  it('exige le mot de passe actuel', () => {
    expect(
      accountPasswordUpdateSchema.safeParse({ ...valid, currentPassword: '' }).success
    ).toBe(false)
  })
})
