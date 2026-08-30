import { describe, expect, it } from 'vitest'
import { Role } from '~/shared/utils/enums'
import {
  landingPageFor,
  resolvePostLoginPath,
  rolesAllowedFor,
  spacePrefixFor,
  spacePrefixOf
} from '~/shared/utils/auth-redirect'

describe('landingPageFor', () => {
  it('envoie le tuteur vers son tableau de bord', () => {
    expect(landingPageFor(Role.Tutor)).toBe('/tuteur/dashboard')
  })

  it.each([Role.Alternant, Role.Stagiaire])(
    'envoie %s vers le tableau de bord apprenant',
    (role) => {
      expect(landingPageFor(role)).toBe('/alternant/dashboard')
    }
  )
})

describe('rolesAllowedFor', () => {
  it('réserve /tuteur au rôle Tutor', () => {
    expect(rolesAllowedFor('/tuteur')).toEqual([Role.Tutor])
    expect(rolesAllowedFor('/tuteur/dashboard')).toEqual([Role.Tutor])
    expect(rolesAllowedFor('/tuteur/alternants/42/livret')).toEqual([Role.Tutor])
  })

  it('réserve /alternant aux apprenants (Alternant et Stagiaire)', () => {
    expect(rolesAllowedFor('/alternant')).toEqual([Role.Alternant, Role.Stagiaire])
    expect(rolesAllowedFor('/alternant/courses')).toEqual([Role.Alternant, Role.Stagiaire])
  })

  it('ignore la query et le hash', () => {
    expect(rolesAllowedFor('/tuteur/competences?student=42')).toEqual([Role.Tutor])
    expect(rolesAllowedFor('/tuteur?x=1')).toEqual([Role.Tutor])
  })

  it('renvoie null hors espace (pages publiques et communes)', () => {
    expect(rolesAllowedFor('/')).toBeNull()
    expect(rolesAllowedFor('/login')).toBeNull()
    expect(rolesAllowedFor('/account')).toBeNull()
    expect(rolesAllowedFor('/notifications')).toBeNull()
  })

  it('ne confond pas un préfixe partiel avec un espace', () => {
    expect(rolesAllowedFor('/tuteurs')).toBeNull()
    expect(rolesAllowedFor('/alternants')).toBeNull()
  })
})

describe('spacePrefixFor', () => {
  it('associe chaque rôle à son espace', () => {
    expect(spacePrefixFor(Role.Tutor)).toBe('/tuteur')
    expect(spacePrefixFor(Role.Alternant)).toBe('/alternant')
    expect(spacePrefixFor(Role.Stagiaire)).toBe('/alternant')
  })
})

describe('spacePrefixOf', () => {
  it("retrouve le préfixe d'espace d'un chemin", () => {
    expect(spacePrefixOf('/tuteur/rapports/42')).toBe('/tuteur')
    expect(spacePrefixOf('/alternant/messages')).toBe('/alternant')
  })

  it('renvoie null hors espace', () => {
    expect(spacePrefixOf('/account')).toBeNull()
    expect(spacePrefixOf('/alternants')).toBeNull()
  })
})

describe('resolvePostLoginPath', () => {
  it('respecte un chemin demandé valide et accessible au rôle', () => {
    expect(resolvePostLoginPath(Role.Tutor, '/tuteur/projects/42')).toBe('/tuteur/projects/42')
    expect(resolvePostLoginPath(Role.Alternant, '/alternant/courses')).toBe('/alternant/courses')
  })

  it('respecte un chemin hors espace (pages communes)', () => {
    expect(resolvePostLoginPath(Role.Tutor, '/account')).toBe('/account')
    expect(resolvePostLoginPath(Role.Stagiaire, '/notifications')).toBe('/notifications')
  })

  it('retombe sur le landing du rôle sans chemin demandé', () => {
    expect(resolvePostLoginPath(Role.Tutor)).toBe('/tuteur/dashboard')
    expect(resolvePostLoginPath(Role.Alternant, null)).toBe('/alternant/dashboard')
    expect(resolvePostLoginPath(Role.Stagiaire, null)).toBe('/alternant/dashboard')
  })

  it("ignore un redirect vers un espace interdit au rôle (pas de rebond /forbidden)", () => {
    expect(resolvePostLoginPath(Role.Alternant, '/tuteur/dashboard')).toBe('/alternant/dashboard')
    expect(resolvePostLoginPath(Role.Stagiaire, '/tuteur/alternants/42')).toBe('/alternant/dashboard')
    expect(resolvePostLoginPath(Role.Tutor, '/alternant/courses')).toBe('/tuteur/dashboard')
  })

  it("ignore un redirect interdit même avec une query", () => {
    expect(resolvePostLoginPath(Role.Alternant, '/tuteur/competences?student=42')).toBe(
      '/alternant/dashboard'
    )
  })

  it.each([
    'https://evil.example.com',
    '//evil.example.com',
    'javascript:alert(1)',
    'relative-no-slash'
  ])('rejette la redirection dangereuse %s', (target) => {
    expect(resolvePostLoginPath(Role.Tutor, target)).toBe('/tuteur/dashboard')
  })
})
