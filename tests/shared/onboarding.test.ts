import { describe, expect, it } from 'vitest'
import { Role } from '~/shared/utils/enums'
import {
  ONBOARDING_PATH,
  answersForRole,
  onboardingAnswersSchema,
  onboardingItemsFor,
  onboardingRedirect,
  onboardingSummary,
  type OnboardingAnswers
} from '~/shared/utils/onboarding'
import { visibleItems } from '~/shared/utils/questionnaire'

const empty = onboardingAnswersSchema.parse({})

describe('onboardingItemsFor', () => {
  it('commence par un écran de bienvenue personnalisé', () => {
    const [first] = onboardingItemsFor(Role.Alternant, 'Lina')
    expect(first?.kind).toBe('intro')
    expect(first?.title).toContain('Lina')
  })

  it('pose les questions entreprise, contrat et rythme à un alternant en poste', () => {
    const items = onboardingItemsFor(Role.Alternant, 'Lina')
    expect(visibleItems(items, { situation: 'en_poste' }).map((i) => i.id)).toEqual([
      'bienvenue',
      'situation',
      'formation',
      'niveauEtudes',
      'entreprise',
      'contrat',
      'rythme',
      'objectifs'
    ])
  })

  it('saute entreprise, contrat et rythme pour un alternant en recherche', () => {
    const items = onboardingItemsFor(Role.Alternant, 'Lina')
    expect(visibleItems(items, { situation: 'en_recherche' }).map((i) => i.id)).toEqual([
      'bienvenue',
      'situation',
      'formation',
      'niveauEtudes',
      'objectifs'
    ])
  })

  it('ne demande jamais de rythme d\'alternance à un stagiaire', () => {
    const items = onboardingItemsFor(Role.Stagiaire, 'Noa')
    const ids = visibleItems(items, { situation: 'en_poste' }).map((i) => i.id)
    expect(ids).toContain('entreprise')
    expect(ids).not.toContain('rythme')
  })

  it('pose un questionnaire propre au tuteur', () => {
    const ids = onboardingItemsFor(Role.Tutor, 'Marc').map((i) => i.id)
    expect(ids).toEqual(['bienvenue', 'fonction', 'organisation', 'effectif', 'objectifs'])
  })

  it('la première vraie question est obligatoire', () => {
    for (const role of [Role.Tutor, Role.Alternant, Role.Stagiaire]) {
      const question = onboardingItemsFor(role, 'X')[1]
      expect(question && 'required' in question && question.required).toBe(true)
    }
  })
})

describe('onboardingAnswersSchema', () => {
  it('accepte un payload vide et normalise tous les champs', () => {
    expect(empty).toEqual({
      situation: null,
      etablissement: null,
      formation: null,
      niveauEtudes: null,
      entreprise: null,
      poste: null,
      dateDebutContrat: null,
      dateFinContrat: null,
      rythme: null,
      fonction: null,
      organisation: null,
      effectif: null,
      objectifs: []
    })
  })

  it('coupe les espaces et transforme une chaîne vide en null', () => {
    const result = onboardingAnswersSchema.parse({ etablissement: '  ESGI ', entreprise: '' })
    expect(result.etablissement).toBe('ESGI')
    expect(result.entreprise).toBeNull()
  })

  it('refuse une valeur hors liste et un texte trop long', () => {
    expect(onboardingAnswersSchema.safeParse({ situation: 'inconnu' }).success).toBe(false)
    expect(onboardingAnswersSchema.safeParse({ objectifs: ['pizza'] }).success).toBe(false)
    expect(onboardingAnswersSchema.safeParse({ poste: 'x'.repeat(161) }).success).toBe(false)
  })

  it('valide les dates au format ISO et leur ordre', () => {
    expect(onboardingAnswersSchema.safeParse({ dateDebutContrat: '01/09/2026' }).success).toBe(false)
    const inverted = onboardingAnswersSchema.safeParse({
      dateDebutContrat: '2026-09-01',
      dateFinContrat: '2025-09-01'
    })
    expect(inverted.success).toBe(false)
    expect(inverted.error?.issues[0]?.path).toEqual(['dateFinContrat'])
    expect(
      onboardingAnswersSchema.safeParse({ dateDebutContrat: '2026-09-01', dateFinContrat: '2028-08-31' })
        .success
    ).toBe(true)
  })

  it('ignore les clés inconnues (ex. updatedAt renvoyé par l\'API)', () => {
    const result = onboardingAnswersSchema.parse({ updatedAt: '2026-09-11T00:00:00Z' })
    expect('updatedAt' in result).toBe(false)
  })
})

describe('answersForRole', () => {
  const full: OnboardingAnswers = {
    ...empty,
    situation: 'en_poste',
    etablissement: 'ESGI',
    entreprise: 'ACME',
    poste: 'Dev',
    dateDebutContrat: '2026-09-01',
    rythme: 'une_une',
    fonction: 'rh',
    organisation: 'ACME',
    effectif: 'un',
    objectifs: ['missions', 'visites']
  }

  it('un tuteur ne conserve que les champs tuteur et ses objectifs', () => {
    expect(answersForRole(Role.Tutor, full)).toEqual({
      ...empty,
      poste: 'Dev',
      fonction: 'rh',
      organisation: 'ACME',
      effectif: 'un',
      // `missions` existe dans les deux listes, `visites` n'est que tuteur.
      objectifs: ['missions', 'visites']
    })
  })

  it('un alternant en poste garde entreprise et rythme, perd les champs tuteur', () => {
    expect(answersForRole(Role.Alternant, full)).toEqual({
      ...empty,
      situation: 'en_poste',
      etablissement: 'ESGI',
      entreprise: 'ACME',
      poste: 'Dev',
      dateDebutContrat: '2026-09-01',
      rythme: 'une_une',
      objectifs: ['missions']
    })
  })

  it('un alternant en recherche perd les champs entreprise', () => {
    const result = answersForRole(Role.Alternant, { ...full, situation: 'en_recherche' })
    expect(result.entreprise).toBeNull()
    expect(result.poste).toBeNull()
    expect(result.dateDebutContrat).toBeNull()
    expect(result.rythme).toBeNull()
    expect(result.etablissement).toBe('ESGI')
  })

  it('un stagiaire n\'a jamais de rythme d\'alternance', () => {
    expect(answersForRole(Role.Stagiaire, full).rythme).toBeNull()
  })
})

describe('onboardingSummary', () => {
  it('ne liste que les réponses renseignées, avec leurs libellés', () => {
    const rows = onboardingSummary(Role.Alternant, {
      ...empty,
      situation: 'en_poste',
      etablissement: 'ESGI',
      dateDebutContrat: '2026-09-01',
      dateFinContrat: '2028-08-31',
      objectifs: ['offres']
    })
    expect(rows).toEqual([
      { label: 'Situation', value: "J'ai déjà une entreprise d'accueil" },
      { label: 'Établissement', value: 'ESGI' },
      { label: 'Contrat', value: 'du 01/09/2026 au 31/08/2028' },
      { label: 'Attentes', value: 'Trouver une alternance' }
    ])
  })

  it('résume le profil d\'un tuteur', () => {
    const rows = onboardingSummary(Role.Tutor, { ...empty, fonction: 'rh', effectif: 'plus_dix' })
    expect(rows.map((r) => r.value)).toEqual(['Responsable RH ou formation', 'Plus de 10'])
  })

  it('est vide sans réponse', () => {
    expect(onboardingSummary(Role.Stagiaire, empty)).toEqual([])
  })
})

describe('onboardingRedirect', () => {
  it('ramène un utilisateur non onboardé sur /onboarding', () => {
    expect(onboardingRedirect('/tuteur/dashboard', { role: Role.Tutor, onboarded: false })).toBe(
      ONBOARDING_PATH
    )
    expect(onboardingRedirect('/account', { role: Role.Alternant })).toBe(ONBOARDING_PATH)
  })

  it('laisse passer un utilisateur onboardé', () => {
    expect(onboardingRedirect('/tuteur/dashboard', { role: Role.Tutor, onboarded: true })).toBeNull()
  })

  it('ne redirige pas /onboarding vers lui-même', () => {
    expect(onboardingRedirect(ONBOARDING_PATH, { role: Role.Alternant, onboarded: false })).toBeNull()
  })

  it('renvoie un utilisateur onboardé de /onboarding vers son landing, sauf ?again', () => {
    expect(onboardingRedirect(ONBOARDING_PATH, { role: Role.Tutor, onboarded: true })).toBe(
      '/tuteur/dashboard'
    )
    expect(onboardingRedirect(ONBOARDING_PATH, { role: Role.Stagiaire, onboarded: true })).toBe(
      '/alternant/dashboard'
    )
    expect(onboardingRedirect(ONBOARDING_PATH, { role: Role.Tutor, onboarded: true }, true)).toBeNull()
  })
})
