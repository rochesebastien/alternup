import { describe, expect, it } from 'vitest'
import { Role } from '~/shared/utils/enums'
import {
  isRoleDependent,
  legacyPathForRole,
  resolveLegacyTarget
} from '~/shared/utils/legacy-routes'

const UUID = '11111111-1111-1111-1111-111111111111'

describe('resolveLegacyTarget', () => {
  it('résout une route mono-rôle vers une cible fixe', () => {
    expect(resolveLegacyTarget('/alternants')).toBe('/tuteur/alternants')
    expect(resolveLegacyTarget('/projects')).toBe('/tuteur/projects')
    expect(resolveLegacyTarget('/courses')).toBe('/alternant/courses')
    expect(resolveLegacyTarget('/missions')).toBe('/alternant/missions')
  })

  it('résout une route ex-mixte vers une cible par rôle', () => {
    expect(resolveLegacyTarget('/dashboard')).toEqual({
      tuteur: '/tuteur/dashboard',
      alternant: '/alternant/dashboard'
    })
    expect(resolveLegacyTarget('/calendar')).toEqual({
      tuteur: '/tuteur/calendar',
      alternant: '/alternant/calendar'
    })
  })

  it('conserve le reste du chemin des routes dynamiques', () => {
    expect(resolveLegacyTarget(`/rapports/${UUID}`)).toEqual({
      tuteur: `/tuteur/rapports/${UUID}`,
      alternant: `/alternant/rapports/${UUID}`
    })
    expect(resolveLegacyTarget(`/messages/${UUID}`)).toEqual({
      tuteur: `/tuteur/messages/${UUID}`,
      alternant: `/alternant/messages/${UUID}`
    })
    expect(resolveLegacyTarget(`/alternants/${UUID}`)).toBe(`/tuteur/alternants/${UUID}`)
    expect(resolveLegacyTarget(`/alternants/${UUID}/livret`)).toBe(
      `/tuteur/alternants/${UUID}/livret`
    )
    expect(resolveLegacyTarget(`/projects/${UUID}`)).toBe(`/tuteur/projects/${UUID}`)
  })

  it('distingue /bulletins/carte (deux espaces) de /bulletins/[id] (tuteur seul)', () => {
    expect(resolveLegacyTarget(`/bulletins/carte/${UUID}`)).toEqual({
      tuteur: `/tuteur/bulletins/carte/${UUID}`,
      alternant: `/alternant/bulletins/carte/${UUID}`
    })
    expect(resolveLegacyTarget(`/bulletins/${UUID}`)).toBe(`/tuteur/bulletins/${UUID}`)
  })

  it('laisse passer les chemins non legacy', () => {
    expect(resolveLegacyTarget('/')).toBeNull()
    expect(resolveLegacyTarget('/login')).toBeNull()
    expect(resolveLegacyTarget('/account')).toBeNull()
    expect(resolveLegacyTarget('/notifications')).toBeNull()
    expect(resolveLegacyTarget('/tuteur/dashboard')).toBeNull()
    expect(resolveLegacyTarget('/alternant/courses')).toBeNull()
  })

  it('ne confond pas un préfixe partiel avec une route legacy', () => {
    expect(resolveLegacyTarget('/dashboard2')).toBeNull()
    expect(resolveLegacyTarget('/rapportsx')).toBeNull()
  })
})

describe('isRoleDependent', () => {
  it('distingue cible fixe et cible par rôle', () => {
    expect(isRoleDependent('/tuteur/alternants')).toBe(false)
    expect(isRoleDependent({ tuteur: '/tuteur/dashboard', alternant: '/alternant/dashboard' })).toBe(
      true
    )
  })
})

describe('legacyPathForRole', () => {
  it('renvoie la cible fixe quel que soit le rôle', () => {
    expect(legacyPathForRole('/tuteur/projects', Role.Alternant)).toBe('/tuteur/projects')
  })

  it('choisit la branche selon le rôle de session', () => {
    const target = { tuteur: '/tuteur/rapports', alternant: '/alternant/rapports' }
    expect(legacyPathForRole(target, Role.Tutor)).toBe('/tuteur/rapports')
    expect(legacyPathForRole(target, Role.Alternant)).toBe('/alternant/rapports')
    expect(legacyPathForRole(target, Role.Stagiaire)).toBe('/alternant/rapports')
  })
})
