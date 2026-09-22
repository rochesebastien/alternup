import { describe, expect, it } from 'vitest'
import { Role } from '~/shared/utils/enums'
import {
  ONBOARDING_PATH,
  SUIVI_OCCURRENCES,
  answersForRole,
  onboardingActionsFrom,
  onboardingActionsSchema,
  weeklySlots,
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

  it('demande le détail des semaines quand le rythme est « autre »', () => {
    const items = onboardingItemsFor(Role.Alternant, 'Lina')
    const ids = visibleItems(items, { situation: 'en_poste', rythme: 'autre' }).map((i) => i.id)
    expect(ids).toContain('rythmeAutre')
    expect(visibleItems(items, { situation: 'en_poste', rythme: 'une_une' }).map((i) => i.id)).not.toContain(
      'rythmeAutre'
    )
  })

  it('propose quatre attentes à un apprenant', () => {
    const objectifs = onboardingItemsFor(Role.Alternant, 'Lina').find((i) => i.id === 'objectifs')
    expect(objectifs && 'options' in objectifs ? objectifs.options.map((o) => o.value) : []).toEqual([
      'missions',
      'rapports',
      'offres',
      'tuteur'
    ])
  })

  it('pose un questionnaire propre au tuteur', () => {
    const ids = onboardingItemsFor(Role.Tutor, 'Marc').map((i) => i.id)
    expect(ids).toEqual(['bienvenue', 'fonction', 'organisation', 'effectif', 'objectifs'])
  })

  it('ajoute les actions de démarrage du tuteur à la première connexion', () => {
    const items = onboardingItemsFor(Role.Tutor, 'Marc', { actions: true })
    expect(visibleItems(items, {}).map((i) => i.id)).toEqual([
      'bienvenue',
      'fonction',
      'organisation',
      'effectif',
      'objectifs',
      'actions',
      'premierApprenant',
      'suiviJour'
    ])
    const full = visibleItems(items, { inviteEmail: 'a@b.fr', suiviJour: '2' }).map((i) => i.id)
    expect(full.slice(-4)).toEqual(['premierApprenant', 'inviteRole', 'suiviJour', 'suiviCreneau'])
  })

  it('refuse un créneau de suivi qui finit avant de commencer', () => {
    const creneau = onboardingItemsFor(Role.Tutor, 'Marc', { actions: true }).find(
      (i) => i.id === 'suiviCreneau'
    )
    expect(creneau?.validate?.({ suiviDebut: '10:00', suiviFin: '09:30' })).toBeTruthy()
    expect(creneau?.validate?.({ suiviDebut: '10:00', suiviFin: '10:30' })).toBeNull()
  })

  it('n\'ajoute jamais d\'actions à un apprenant', () => {
    const ids = onboardingItemsFor(Role.Alternant, 'Lina', { actions: true }).map((i) => i.id)
    expect(ids).not.toContain('premierApprenant')
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
      rythmeSemainesEntreprise: null,
      rythmeSemainesEcole: null,
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

  it('convertit les semaines d\'un rythme « autre » et les borne', () => {
    const result = onboardingAnswersSchema.parse({ rythmeSemainesEntreprise: '3', rythmeSemainesEcole: 1 })
    expect(result.rythmeSemainesEntreprise).toBe(3)
    expect(result.rythmeSemainesEcole).toBe(1)
    expect(onboardingAnswersSchema.parse({ rythmeSemainesEcole: '' }).rythmeSemainesEcole).toBeNull()
    expect(onboardingAnswersSchema.safeParse({ rythmeSemainesEcole: '0' }).success).toBe(false)
    expect(onboardingAnswersSchema.safeParse({ rythmeSemainesEcole: '2.5' }).success).toBe(false)
  })

  it('retire l\'ancienne attente « compétences » côté apprenant, pas côté tuteur', () => {
    const parsed = onboardingAnswersSchema.parse({ objectifs: ['competences', 'missions'] })
    expect(answersForRole(Role.Alternant, parsed).objectifs).toEqual(['missions'])
    expect(answersForRole(Role.Tutor, parsed).objectifs).toEqual(['competences', 'missions'])
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

  it('ne garde les semaines que pour un rythme « autre »', () => {
    const withWeeks = { ...full, rythmeSemainesEntreprise: 3, rythmeSemainesEcole: 1 }
    expect(answersForRole(Role.Alternant, withWeeks).rythmeSemainesEntreprise).toBeNull()
    const autre = answersForRole(Role.Alternant, { ...withWeeks, rythme: 'autre' })
    expect([autre.rythmeSemainesEntreprise, autre.rythmeSemainesEcole]).toEqual([3, 1])
    expect(answersForRole(Role.Stagiaire, { ...withWeeks, rythme: 'autre' }).rythmeSemainesEcole).toBeNull()
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
      rythme: 'autre',
      rythmeSemainesEntreprise: 3,
      rythmeSemainesEcole: 1,
      objectifs: ['offres']
    })
    expect(rows).toEqual([
      { label: 'Situation', value: "J'ai déjà une entreprise d'accueil" },
      { label: 'Établissement', value: 'ESGI' },
      { label: 'Contrat', value: 'du 01/09/2026 au 31/08/2028' },
      { label: 'Rythme', value: '3 semaines entreprise / 1 semaine école' },
      { label: 'Attentes', value: 'Trouver une alternance' }
    ])
  })

  it('affiche le libellé d\'attente propre au rôle', () => {
    const learner = onboardingSummary(Role.Alternant, { ...empty, objectifs: ['missions'] })
    const tutor = onboardingSummary(Role.Tutor, { ...empty, objectifs: ['missions'] })
    expect(learner[0]?.value).toBe('Suivre mes missions, livrables et compétences')
    expect(tutor[0]?.value).toBe('Gérer les projets et missions')
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

describe('weeklySlots', () => {
  // Dates construites en heure locale : le calcul est fait dans le fuseau du navigateur.
  const tuesday = (d: Date) => d.getDay() === 2

  it('commence au prochain jour choisi et avance de semaine en semaine', () => {
    const from = new Date(2026, 8, 21, 9, 0) // lundi 21 septembre 2026, 9 h
    const slots = weeklySlots(from, 2, '10:00', '10:30', 3)
    const starts = slots.map((s) => new Date(s.startTime))
    expect(starts.every(tuesday)).toBe(true)
    expect(starts.map((d) => d.getDate())).toEqual([22, 29, 6])
    expect(starts.map((d) => d.getHours())).toEqual([10, 10, 10])
    expect(new Date(slots[0]!.endTime).getMinutes()).toBe(30)
  })

  it('prend le jour même si le créneau est encore à venir, sinon la semaine suivante', () => {
    const tuesdayMorning = new Date(2026, 8, 22, 8, 0)
    expect(new Date(weeklySlots(tuesdayMorning, 2, '10:00', '10:30', 1)[0]!.startTime).getDate()).toBe(22)
    const tuesdayNoon = new Date(2026, 8, 22, 12, 0)
    expect(new Date(weeklySlots(tuesdayNoon, 2, '10:00', '10:30', 1)[0]!.startTime).getDate()).toBe(29)
  })

  it('garde la même heure locale après un changement d\'heure', () => {
    const slots = weeklySlots(new Date(2026, 9, 1, 9, 0), 5, '14:00', '15:00', 8)
    expect(slots.map((s) => new Date(s.startTime).getHours())).toEqual(Array(8).fill(14))
  })
})

describe('onboardingActionsFrom', () => {
  const now = new Date(2026, 8, 21, 9, 0)

  it('ne produit aucune action sans réponse', () => {
    expect(onboardingActionsFrom({ suiviDebut: '10:00', suiviFin: '10:30' }, now)).toEqual({})
  })

  it('prépare l\'invitation et les rendez-vous de suivi', () => {
    const actions = onboardingActionsFrom(
      {
        inviteEmail: ' lea@exemple.fr ',
        inviteFirstName: 'Léa',
        inviteRole: 'Alternant',
        suiviJour: '2',
        suiviDebut: '10:00',
        suiviFin: '10:30'
      },
      now
    )
    expect(actions.invitation).toEqual({
      email: 'lea@exemple.fr',
      firstName: 'Léa',
      lastName: undefined,
      role: 'Alternant'
    })
    expect(actions.suivi?.slots).toHaveLength(SUIVI_OCCURRENCES)
    expect(onboardingActionsSchema.safeParse(actions).success).toBe(true)
  })

  it('ignore un créneau incohérent', () => {
    expect(
      onboardingActionsFrom({ suiviJour: '2', suiviDebut: '11:00', suiviFin: '10:00' }, now).suivi
    ).toBeUndefined()
  })
})

describe('onboardingActionsSchema', () => {
  it('accepte l\'absence d\'actions', () => {
    expect(onboardingActionsSchema.parse(undefined)).toEqual({})
  })

  it('refuse un rendez-vous inversé et plus de 52 créneaux', () => {
    const slot = { startTime: '2026-09-22T10:00:00.000Z', endTime: '2026-09-22T09:00:00.000Z' }
    expect(onboardingActionsSchema.safeParse({ suivi: { slots: [slot] } }).success).toBe(false)
    const ok = { startTime: '2026-09-22T10:00:00.000Z', endTime: '2026-09-22T10:30:00.000Z' }
    expect(onboardingActionsSchema.safeParse({ suivi: { slots: Array(53).fill(ok) } }).success).toBe(false)
  })

  it('refuse une invitation au rôle tuteur', () => {
    expect(
      onboardingActionsSchema.safeParse({ invitation: { email: 'x@y.fr', role: 'Tutor' } }).success
    ).toBe(false)
  })
})
