// Onboarding de première connexion (/onboarding) : questions posées par rôle,
// schéma Zod des réponses et règles de redirection. Module PUR, partagé
// client/serveur : rôles en littéraux de chaîne (jamais d'enum Prisma).
//
// Les champs à choix fermé sont stockés en `String` dans `onboarding_profiles`
// et validés ici : ajouter une option ne demande aucune migration, ni miroir
// d'enum dans shared/utils/enums.ts.

import { z } from 'zod'
import type { Role } from '~/shared/utils/enums'
import { landingPageFor } from '~/shared/utils/auth-redirect'
import type { QuestionnaireAnswers, QuestionnaireItem, QuestionnaireOption } from '~/shared/utils/questionnaire'

export const ONBOARDING_PATH = '/onboarding'

// ─── Options ────────────────────────────────────────────────────────────────

export const LEARNER_SITUATIONS = ['en_poste', 'en_recherche'] as const
export const NIVEAUX_ETUDES = ['bac', 'bac_2', 'bac_3', 'bac_5', 'autre'] as const
export const RYTHMES_ALTERNANCE = ['une_une', 'deux_trois', 'trois_une', 'autre'] as const
export const TUTOR_FONCTIONS = ['maitre_apprentissage', 'tuteur_pedagogique', 'rh', 'autre'] as const
export const TUTOR_EFFECTIFS = ['un', 'deux_cinq', 'six_dix', 'plus_dix'] as const
export const LEARNER_OBJECTIFS = ['missions', 'rapports', 'competences', 'offres', 'tuteur'] as const
export const TUTOR_OBJECTIFS = ['presences', 'missions', 'rapports', 'visites', 'competences'] as const

const SITUATION_OPTIONS: QuestionnaireOption[] = [
  {
    value: 'en_poste',
    label: "J'ai déjà une entreprise d'accueil",
    description: 'Contrat signé, tuteur en place.',
    icon: 'i-lucide-building-2'
  },
  {
    value: 'en_recherche',
    label: 'Je suis encore en recherche',
    description: 'Alternup vous propose chaque jour de nouvelles offres.',
    icon: 'i-lucide-search'
  }
]

const NIVEAU_OPTIONS: QuestionnaireOption[] = [
  { value: 'bac', label: 'Bac ou équivalent', description: 'CAP, Bac pro, Bac général…' },
  { value: 'bac_2', label: 'Bac +2', description: 'BTS, DUT, BUT 2e année…' },
  { value: 'bac_3', label: 'Bac +3', description: 'Licence, Bachelor, BUT…' },
  { value: 'bac_5', label: 'Bac +5', description: 'Master, école d\'ingénieurs, école de commerce…' },
  { value: 'autre', label: 'Autre' }
]

const RYTHME_OPTIONS: QuestionnaireOption[] = [
  { value: 'une_une', label: '1 semaine école / 1 semaine entreprise' },
  { value: 'deux_trois', label: '2 jours école / 3 jours entreprise' },
  { value: 'trois_une', label: '1 semaine école / 3 semaines entreprise' },
  { value: 'autre', label: 'Autre rythme' }
]

const FONCTION_OPTIONS: QuestionnaireOption[] = [
  {
    value: 'maitre_apprentissage',
    label: "Maître d'apprentissage",
    description: "Vous encadrez l'apprenant en entreprise.",
    icon: 'i-lucide-briefcase'
  },
  {
    value: 'tuteur_pedagogique',
    label: 'Tuteur pédagogique',
    description: "Vous suivez l'apprenant pour l'école ou le CFA.",
    icon: 'i-lucide-graduation-cap'
  },
  {
    value: 'rh',
    label: 'Responsable RH ou formation',
    description: 'Vous pilotez les alternants et stagiaires de votre structure.',
    icon: 'i-lucide-users'
  },
  { value: 'autre', label: 'Autre', icon: 'i-lucide-circle-dashed' }
]

const EFFECTIF_OPTIONS: QuestionnaireOption[] = [
  { value: 'un', label: 'Un seul' },
  { value: 'deux_cinq', label: '2 à 5' },
  { value: 'six_dix', label: '6 à 10' },
  { value: 'plus_dix', label: 'Plus de 10' }
]

const LEARNER_OBJECTIF_OPTIONS: QuestionnaireOption[] = [
  { value: 'missions', label: 'Suivre mes missions et livrables', icon: 'i-lucide-list-checks' },
  { value: 'rapports', label: 'Rédiger mes rapports de période', icon: 'i-lucide-file-text' },
  { value: 'competences', label: 'Suivre mes compétences', icon: 'i-lucide-target' },
  { value: 'offres', label: "Trouver une alternance", icon: 'i-lucide-briefcase' },
  { value: 'tuteur', label: 'Échanger avec mon tuteur', icon: 'i-lucide-messages-square' }
]

const TUTOR_OBJECTIF_OPTIONS: QuestionnaireOption[] = [
  { value: 'presences', label: 'Suivre les présences', icon: 'i-lucide-calendar-check' },
  { value: 'missions', label: 'Gérer les projets et missions', icon: 'i-lucide-list-checks' },
  { value: 'rapports', label: 'Valider rapports et bulletins', icon: 'i-lucide-file-text' },
  { value: 'visites', label: 'Planifier les visites', icon: 'i-lucide-map-pin' },
  { value: 'competences', label: 'Évaluer les compétences', icon: 'i-lucide-target' }
]

/** Libellés d'affichage (page Mon compte, fiche apprenant) indexés par valeur. */
export const ONBOARDING_LABELS = {
  situation: labelsOf(SITUATION_OPTIONS),
  niveauEtudes: labelsOf(NIVEAU_OPTIONS),
  rythme: labelsOf(RYTHME_OPTIONS),
  fonction: labelsOf(FONCTION_OPTIONS),
  effectif: labelsOf(EFFECTIF_OPTIONS),
  objectifs: labelsOf([...LEARNER_OBJECTIF_OPTIONS, ...TUTOR_OBJECTIF_OPTIONS])
} as const

function labelsOf(options: QuestionnaireOption[]): Record<string, string> {
  return Object.fromEntries(options.map((o) => [o.value, o.label]))
}

// ─── Questions par rôle ─────────────────────────────────────────────────────

const isEnPoste = (answers: QuestionnaireAnswers) => answers.situation === 'en_poste'

function learnerItems(role: Role, firstName: string): QuestionnaireItem[] {
  const stage = role === 'Stagiaire'
  return [
    {
      id: 'bienvenue',
      kind: 'intro',
      title: `Bienvenue sur Alternup, ${firstName} !`,
      description:
        'Quelques questions — deux minutes, pas plus — pour adapter votre espace. Vous pourrez modifier ces réponses à tout moment depuis « Mon compte ».'
    },
    {
      id: 'situation',
      kind: 'single',
      required: true,
      title: 'Où en êtes-vous aujourd\'hui ?',
      options: stage
        ? SITUATION_OPTIONS.map((o) =>
            o.value === 'en_poste' ? { ...o, label: "J'ai déjà mon entreprise de stage" } : o
          )
        : SITUATION_OPTIONS
    },
    {
      id: 'formation',
      kind: 'fields',
      title: 'Votre formation',
      description: 'Elle apparaît sur vos bulletins et votre livret de suivi.',
      fields: [
        {
          name: 'etablissement',
          label: 'Établissement',
          type: 'text',
          placeholder: 'École, CFA, université…',
          required: true,
          autocomplete: 'organization'
        },
        {
          name: 'formation',
          label: 'Diplôme préparé',
          type: 'text',
          placeholder: 'BTS SIO, Master MIAGE, Bachelor marketing…'
        }
      ]
    },
    {
      id: 'niveauEtudes',
      kind: 'single',
      title: 'Quel niveau préparez-vous ?',
      options: NIVEAU_OPTIONS
    },
    {
      id: 'entreprise',
      kind: 'fields',
      when: isEnPoste,
      title: "Votre entreprise d'accueil",
      fields: [
        {
          name: 'entreprise',
          label: "Nom de l'entreprise",
          type: 'text',
          required: true,
          autocomplete: 'organization'
        },
        {
          name: 'poste',
          label: 'Intitulé du poste',
          type: 'text',
          placeholder: 'Développeur web, assistant marketing…',
          autocomplete: 'organization-title'
        }
      ]
    },
    {
      id: 'contrat',
      kind: 'fields',
      when: isEnPoste,
      title: stage ? 'Les dates de votre stage' : 'Les dates de votre contrat',
      description: 'Elles servent aux bilans de période et aux rappels de fin de contrat.',
      fields: [
        { name: 'dateDebutContrat', label: 'Début', type: 'date' },
        { name: 'dateFinContrat', label: 'Fin', type: 'date' }
      ]
    },
    {
      id: 'rythme',
      kind: 'single',
      when: (answers) => !stage && isEnPoste(answers),
      title: "Votre rythme d'alternance",
      options: RYTHME_OPTIONS
    },
    {
      id: 'objectifs',
      kind: 'multiple',
      title: "Qu'attendez-vous d'Alternup ?",
      description: 'Plusieurs réponses possibles.',
      options: LEARNER_OBJECTIF_OPTIONS
    }
  ]
}

function tutorItems(firstName: string): QuestionnaireItem[] {
  return [
    {
      id: 'bienvenue',
      kind: 'intro',
      title: `Bienvenue sur Alternup, ${firstName} !`,
      description:
        'Quelques questions — deux minutes, pas plus — pour adapter votre espace. Vous pourrez modifier ces réponses à tout moment depuis « Mon compte ».'
    },
    {
      id: 'fonction',
      kind: 'single',
      required: true,
      title: 'Quel est votre rôle auprès des apprenants ?',
      options: FONCTION_OPTIONS
    },
    {
      id: 'organisation',
      kind: 'fields',
      title: 'Votre organisation',
      fields: [
        {
          name: 'organisation',
          label: "Nom de l'entreprise, de l'école ou du CFA",
          type: 'text',
          required: true,
          autocomplete: 'organization'
        },
        {
          name: 'poste',
          label: 'Votre fonction',
          type: 'text',
          placeholder: 'Lead développeur, responsable pédagogique…',
          autocomplete: 'organization-title'
        }
      ]
    },
    {
      id: 'effectif',
      kind: 'single',
      title: "Combien d'apprenants suivez-vous ?",
      options: EFFECTIF_OPTIONS
    },
    {
      id: 'objectifs',
      kind: 'multiple',
      title: "Qu'attendez-vous d'Alternup ?",
      description: 'Plusieurs réponses possibles.',
      options: TUTOR_OBJECTIF_OPTIONS
    }
  ]
}

export function onboardingItemsFor(role: Role, firstName: string): QuestionnaireItem[] {
  return role === 'Tutor' ? tutorItems(firstName) : learnerItems(role, firstName)
}

// ─── Réponses ───────────────────────────────────────────────────────────────

/** Texte libre optionnel : vide → `null`, sinon coupé à 160 caractères. */
const text = z
  .string()
  .trim()
  .max(160, '160 caractères maximum.')
  .nullish()
  .transform((v) => (v ? v : null))

const isoDate = z
  .iso.date('Date invalide.')
  .nullish()
  .transform((v) => (v ? v : null))

function enumOrNull<const T extends readonly [string, ...string[]]>(values: T) {
  return z
    .enum(values)
    .nullish()
    .transform((v) => (v ? v : null))
}

/**
 * Payload de `POST /api/onboarding` : toutes les réponses sont optionnelles
 * (branchement, questions passées) — l'obligation de répondre est une règle
 * d'interface, portée par `required` dans la définition des questions.
 */
export const onboardingAnswersSchema = z
  .object({
    situation: enumOrNull(LEARNER_SITUATIONS),
    etablissement: text,
    formation: text,
    niveauEtudes: enumOrNull(NIVEAUX_ETUDES),
    entreprise: text,
    poste: text,
    dateDebutContrat: isoDate,
    dateFinContrat: isoDate,
    rythme: enumOrNull(RYTHMES_ALTERNANCE),
    fonction: enumOrNull(TUTOR_FONCTIONS),
    organisation: text,
    effectif: enumOrNull(TUTOR_EFFECTIFS),
    objectifs: z.array(z.enum([...LEARNER_OBJECTIFS, ...TUTOR_OBJECTIFS])).max(10).default([])
  })
  .refine(
    (d) => !d.dateDebutContrat || !d.dateFinContrat || d.dateFinContrat >= d.dateDebutContrat,
    { message: 'La date de fin doit être postérieure à la date de début.', path: ['dateFinContrat'] }
  )

export type OnboardingAnswersInput = z.input<typeof onboardingAnswersSchema>
export type OnboardingAnswers = z.output<typeof onboardingAnswersSchema>

// `poste` est commun aux deux rôles (poste de l'apprenant / fonction du tuteur).
const LEARNER_ONLY_FIELDS = [
  'situation',
  'etablissement',
  'formation',
  'niveauEtudes',
  'entreprise',
  'dateDebutContrat',
  'dateFinContrat',
  'rythme'
] as const
const EN_POSTE_FIELDS = ['entreprise', 'poste', 'dateDebutContrat', 'dateFinContrat', 'rythme'] as const
const TUTOR_ONLY_FIELDS = ['fonction', 'organisation', 'effectif'] as const

/**
 * Réponses cohérentes avec le rôle et le branchement : un tuteur ne porte pas
 * de champ apprenant (et inversement), un apprenant en recherche n'a pas
 * d'entreprise, un stagiaire pas de rythme d'alternance, et les objectifs sont
 * bornés à la liste du rôle. Appliqué côté serveur avant écriture.
 */
export function answersForRole(role: Role, answers: OnboardingAnswers): OnboardingAnswers {
  const result: OnboardingAnswers = { ...answers }
  const allowedObjectifs: readonly string[] = role === 'Tutor' ? TUTOR_OBJECTIFS : LEARNER_OBJECTIFS
  result.objectifs = answers.objectifs.filter((o) => allowedObjectifs.includes(o))

  if (role === 'Tutor') {
    for (const key of LEARNER_ONLY_FIELDS) result[key] = null
    return result
  }

  for (const key of TUTOR_ONLY_FIELDS) result[key] = null
  if (result.situation !== 'en_poste') {
    for (const key of EN_POSTE_FIELDS) result[key] = null
  }
  if (role === 'Stagiaire') result.rythme = null
  return result
}

/** Profil tel qu'exposé par `GET /api/onboarding` (dates en `YYYY-MM-DD`). */
export type OnboardingProfileView = OnboardingAnswers & { updatedAt: string }

export interface OnboardingSummaryRow {
  label: string
  value: string
}

function formatDateFr(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Lignes « libellé → valeur » des réponses renseignées, pour l'affichage. */
export function onboardingSummary(role: Role, p: OnboardingAnswers): OnboardingSummaryRow[] {
  const rows: OnboardingSummaryRow[] = []
  const push = (label: string, value: string | null | undefined) => {
    if (value) rows.push({ label, value })
  }

  if (role === 'Tutor') {
    push('Rôle', p.fonction && ONBOARDING_LABELS.fonction[p.fonction])
    push('Organisation', p.organisation)
    push('Fonction', p.poste)
    push('Apprenants suivis', p.effectif && ONBOARDING_LABELS.effectif[p.effectif])
  } else {
    push('Situation', p.situation && ONBOARDING_LABELS.situation[p.situation])
    push('Établissement', p.etablissement)
    push('Diplôme préparé', p.formation)
    push('Niveau', p.niveauEtudes && ONBOARDING_LABELS.niveauEtudes[p.niveauEtudes])
    push('Entreprise', p.entreprise)
    push('Poste', p.poste)
    if (p.dateDebutContrat || p.dateFinContrat) {
      const debut = p.dateDebutContrat ? `du ${formatDateFr(p.dateDebutContrat)}` : ''
      const fin = p.dateFinContrat ? `au ${formatDateFr(p.dateFinContrat)}` : ''
      push(role === 'Stagiaire' ? 'Stage' : 'Contrat', [debut, fin].filter(Boolean).join(' '))
    }
    push('Rythme', p.rythme && ONBOARDING_LABELS.rythme[p.rythme])
  }

  if (p.objectifs.length) {
    push('Attentes', p.objectifs.map((o) => ONBOARDING_LABELS.objectifs[o] ?? o).join(', '))
  }
  return rows
}

// ─── Redirection ────────────────────────────────────────────────────────────

/**
 * Cible de redirection du middleware `onboarding.global.ts`, `null` si la
 * navigation est libre. Un utilisateur connecté qui n'a pas terminé son
 * onboarding est ramené sur /onboarding ; une fois terminé, /onboarding
 * renvoie vers le landing du rôle — sauf demande explicite de refaire le
 * questionnaire (`?again=1`, bouton de la page Mon compte).
 */
export function onboardingRedirect(
  path: string,
  user: { role: Role; onboarded?: boolean },
  again = false
): string | null {
  if (path === ONBOARDING_PATH) {
    return user.onboarded && !again ? landingPageFor(user.role) : null
  }
  return user.onboarded ? null : ONBOARDING_PATH
}
