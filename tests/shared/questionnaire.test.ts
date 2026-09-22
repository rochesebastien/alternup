import { describe, expect, it } from 'vitest'
import {
  answersAfterSkip,
  fieldFormatError,
  isItemComplete,
  itemError,
  isItemSkippable,
  questionProgress,
  shortcutFor,
  toggleChoice,
  visibleItems,
  type QuestionnaireItem
} from '~/shared/utils/questionnaire'

const items: QuestionnaireItem[] = [
  { id: 'intro', kind: 'intro', title: 'Bienvenue' },
  {
    id: 'situation',
    kind: 'single',
    required: true,
    title: 'Situation',
    options: [
      { value: 'en_poste', label: 'En poste' },
      { value: 'en_recherche', label: 'En recherche' }
    ]
  },
  {
    id: 'entreprise',
    kind: 'fields',
    title: 'Entreprise',
    when: (a) => a.situation === 'en_poste',
    fields: [
      { name: 'entreprise', label: 'Nom', type: 'text', required: true },
      { name: 'poste', label: 'Poste', type: 'text' }
    ]
  },
  {
    id: 'objectifs',
    kind: 'multiple',
    title: 'Objectifs',
    options: [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' }
    ]
  }
]

describe('visibleItems', () => {
  it('masque une question dont le prédicat est faux', () => {
    expect(visibleItems(items, {}).map((i) => i.id)).toEqual(['intro', 'situation', 'objectifs'])
  })

  it('affiche la question dès que le prédicat devient vrai', () => {
    expect(visibleItems(items, { situation: 'en_poste' }).map((i) => i.id)).toEqual([
      'intro',
      'situation',
      'entreprise',
      'objectifs'
    ])
  })
})

describe('isItemComplete', () => {
  const [intro, situation, entreprise, objectifs] = items as [
    QuestionnaireItem,
    QuestionnaireItem,
    QuestionnaireItem,
    QuestionnaireItem
  ]

  it('un écran d\'introduction est toujours complet', () => {
    expect(isItemComplete(intro, {})).toBe(true)
  })

  it('un choix unique obligatoire exige une valeur', () => {
    expect(isItemComplete(situation, {})).toBe(false)
    expect(isItemComplete(situation, { situation: '' })).toBe(false)
    expect(isItemComplete(situation, { situation: 'en_poste' })).toBe(true)
  })

  it('des champs obligatoires exigent un texte non vide', () => {
    expect(isItemComplete(entreprise, {})).toBe(false)
    expect(isItemComplete(entreprise, { entreprise: '   ' })).toBe(false)
    expect(isItemComplete(entreprise, { entreprise: 'ACME' })).toBe(true)
  })

  it('un choix multiple facultatif est complet sans réponse', () => {
    expect(isItemComplete(objectifs, {})).toBe(true)
    expect(isItemComplete({ ...objectifs, required: true } as QuestionnaireItem, { objectifs: [] })).toBe(false)
    expect(isItemComplete({ ...objectifs, required: true } as QuestionnaireItem, { objectifs: ['a'] })).toBe(true)
  })
})

describe('isItemSkippable', () => {
  it('ne permet de passer que les questions sans réponse obligatoire', () => {
    expect(items.map((i) => isItemSkippable(i))).toEqual([false, false, false, true])
  })
})

describe('questionProgress', () => {
  it('compte les questions hors introduction', () => {
    const visible = visibleItems(items, { situation: 'en_poste' })
    expect(questionProgress(visible, 'intro')).toEqual({ index: 0, total: 3 })
    expect(questionProgress(visible, 'situation')).toEqual({ index: 1, total: 3 })
    expect(questionProgress(visible, 'objectifs')).toEqual({ index: 3, total: 3 })
  })

  it('suit le branchement : le total baisse quand une question est masquée', () => {
    const visible = visibleItems(items, { situation: 'en_recherche' })
    expect(questionProgress(visible, 'objectifs')).toEqual({ index: 2, total: 2 })
  })
})

describe('shortcutFor', () => {
  it('attribue les lettres A, B, C… puis rien au-delà de Z', () => {
    expect(shortcutFor(0)).toBe('A')
    expect(shortcutFor(2)).toBe('C')
    expect(shortcutFor(25)).toBe('Z')
    expect(shortcutFor(26)).toBeNull()
    expect(shortcutFor(-1)).toBeNull()
  })
})

describe('toggleChoice', () => {
  it('remplace la valeur d\'un choix unique', () => {
    expect(toggleChoice('a', 'b', false)).toBe('b')
    expect(toggleChoice(undefined, 'b', false)).toBe('b')
  })

  it('ajoute puis retire une valeur d\'un choix multiple', () => {
    expect(toggleChoice(undefined, 'a', true)).toEqual(['a'])
    expect(toggleChoice(['a'], 'b', true)).toEqual(['a', 'b'])
    expect(toggleChoice(['a', 'b'], 'a', true)).toEqual(['b'])
  })

  it('ignore une valeur scalaire héritée en mode multiple', () => {
    expect(toggleChoice('a', 'b', true)).toEqual(['b'])
  })
})

describe('fieldFormatError', () => {
  it('valide les e-mails et les nombres bornés, ignore les champs vides', () => {
    expect(fieldFormatError({ name: 'e', label: 'E', type: 'email' }, 'pas-un-email')).toBeTruthy()
    expect(fieldFormatError({ name: 'e', label: 'E', type: 'email' }, 'a@b.fr')).toBeNull()
    expect(fieldFormatError({ name: 'e', label: 'E', type: 'email' }, '')).toBeNull()
    const semaines = { name: 'n', label: 'N', type: 'number' as const, min: 1, max: 52 }
    expect(fieldFormatError(semaines, '0')).toBe('Minimum 1.')
    expect(fieldFormatError(semaines, '53')).toBe('Maximum 52.')
    expect(fieldFormatError(semaines, '2.5')).toBe('Nombre entier attendu.')
    expect(fieldFormatError(semaines, 3)).toBeNull()
  })
})

describe('itemError', () => {
  const invite: QuestionnaireItem = {
    id: 'invite',
    kind: 'fields',
    optional: true,
    title: 'Inviter',
    fields: [
      { name: 'prenom', label: 'Prénom', type: 'text' },
      { name: 'email', label: 'Email', type: 'email', required: true }
    ]
  }

  it('signale d\'abord un champ mal formé, puis un champ manquant', () => {
    expect(itemError(invite, { email: 'faux' })).toBe('Adresse e-mail invalide.')
    expect(itemError(invite, { prenom: 'Léa' })).toBe('Merci de renseigner les champs obligatoires.')
    expect(itemError(invite, { email: 'lea@exemple.fr' })).toBeNull()
  })

  it('applique le contrôle propre à l\'étape', () => {
    const creneau: QuestionnaireItem = {
      ...invite,
      validate: (a) => (a.email === 'lea@exemple.fr' ? 'Déjà invitée.' : null)
    }
    expect(itemError(creneau, { email: 'lea@exemple.fr' })).toBe('Déjà invitée.')
  })

  it('une étape optionnelle est toujours passable', () => {
    expect(isItemSkippable(invite)).toBe(true)
  })
})

describe('answersAfterSkip', () => {
  it('vide les réponses d\'une étape optionnelle', () => {
    const item: QuestionnaireItem = {
      id: 'invite',
      kind: 'fields',
      optional: true,
      title: 'Inviter',
      fields: [{ name: 'email', label: 'Email', type: 'email', required: true }]
    }
    expect(answersAfterSkip(item, { email: 'a@b.fr', autre: 'x' })).toEqual({ autre: 'x' })
  })

  it('garde la réponse d\'une question simplement facultative', () => {
    const answers = { objectifs: ['a'] }
    expect(answersAfterSkip(items[3]!, answers)).toBe(answers)
  })
})
