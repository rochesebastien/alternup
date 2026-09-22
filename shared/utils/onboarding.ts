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
import { invitationCreateSchema } from '~/shared/utils/invitations'
import type { QuestionnaireAnswers, QuestionnaireItem, QuestionnaireOption } from '~/shared/utils/questionnaire'

export const ONBOARDING_PATH = '/onboarding'

/** Nombre de rendez-vous hebdomadaires placés par l'action « point de suivi ». */
export const SUIVI_OCCURRENCES = 12

// ─── Options ────────────────────────────────────────────────────────────────

export const LEARNER_SITUATIONS = ['en_poste', 'en_recherche'] as const
export const NIVEAUX_ETUDES = ['bac', 'bac_2', 'bac_3', 'bac_5', 'autre'] as const
export const RYTHMES_ALTERNANCE = ['une_une', 'deux_trois', 'trois_une', 'autre'] as const
export const TUTOR_FONCTIONS = ['maitre_apprentissage', 'tuteur_pedagogique', 'rh', 'autre'] as const
export const TUTOR_EFFECTIFS = ['un', 'deux_cinq', 'six_dix', 'plus_dix'] as const
export const LEARNER_OBJECTIFS = ['missions', 'rapports', 'offres', 'tuteur'] as const
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
  { value: 'autre', label: 'Autre rythme', description: 'Vous préciserez le nombre de semaines.' }
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
  { value: 'missions', label: 'Suivre mes missions, livrables et compétences', icon: 'i-lucide-list-checks' },
  { value: 'rapports', label: 'Rédiger mes rapports de période', icon: 'i-lucide-file-text' },
  { value: 'offres', label: 'Trouver une alternance', icon: 'i-lucide-briefcase' },
  {
    value: 'tuteur',
    label: 'Échanger avec mon tuteur et nouer une relation de confiance',
    icon: 'i-lucide-messages-square'
  }
]

const TUTOR_OBJECTIF_OPTIONS: QuestionnaireOption[] = [
  { value: 'presences', label: 'Suivre les présences', icon: 'i-lucide-calendar-check' },
  { value: 'missions', label: 'Gérer les projets et missions', icon: 'i-lucide-list-checks' },
  { value: 'rapports', label: 'Valider rapports et bulletins', icon: 'i-lucide-file-text' },
  { value: 'visites', label: 'Planifier les visites', icon: 'i-lucide-map-pin' },
  { value: 'competences', label: 'Évaluer les compétences', icon: 'i-lucide-target' }
]

const WEEKDAY_OPTIONS: QuestionnaireOption[] = [
  { value: '1', label: 'Lundi' },
  { value: '2', label: 'Mardi' },
  { value: '3', label: 'Mercredi' },
  { value: '4', label: 'Jeudi' },
  { value: '5', label: 'Vendredi' }
]

const INVITE_ROLE_OPTIONS: QuestionnaireOption[] = [
  { value: 'Alternant', label: 'Alternant', description: "Contrat d'apprentissage ou de professionnalisation.", icon: 'i-lucide-graduation-cap' },
  { value: 'Stagiaire', label: 'Stagiaire', description: 'Convention de stage.', icon: 'i-lucide-briefcase' }
]

/**
 * Libellés d'affichage (page Mon compte, fiche apprenant) indexés par valeur.
 * Les objectifs sont séparés par rôle : une même valeur (`missions`) n'a pas
 * le même libellé côté apprenant et côté tuteur.
 */
export const ONBOARDING_LABELS = {
  situation: labelsOf(SITUATION_OPTIONS),
  niveauEtudes: labelsOf(NIVEAU_OPTIONS),
  rythme: labelsOf(RYTHME_OPTIONS),
  fonction: labelsOf(FONCTION_OPTIONS),
  effectif: labelsOf(EFFECTIF_OPTIONS),
  objectifsApprenant: labelsOf(LEARNER_OBJECTIF_OPTIONS),
  objectifsTuteur: labelsOf(TUTOR_OBJECTIF_OPTIONS),
  jour: labelsOf(WEEKDAY_OPTIONS)
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
      id: 'rythmeAutre',
      kind: 'fields',
      when: (answers) => !stage && isEnPoste(answers) && answers.rythme === 'autre',
      title: 'Précisez votre rythme',
      description: 'Sur un cycle complet, combien de semaines passez-vous à chaque endroit ?',
      fields: [
        { name: 'rythmeSemainesEntreprise', label: 'Semaines en entreprise', type: 'number', min: 1, max: 52, required: true },
        { name: 'rythmeSemainesEcole', label: "Semaines à l'école", type: 'number', min: 1, max: 52, required: true }
      ]
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

const hasInvite = (answers: QuestionnaireAnswers) =>
  typeof answers.inviteEmail === 'string' && answers.inviteEmail.trim().length > 0

/**
 * Actions de démarrage du tuteur, posées à la première connexion seulement
 * (jamais quand il refait le questionnaire depuis « Mon compte ») : elles
 * créent une invitation et des événements de calendrier, exécutés côté
 * serveur à la fin du questionnaire.
 */
function tutorActionItems(): QuestionnaireItem[] {
  return [
    {
      id: 'actions',
      kind: 'intro',
      title: 'Deux actions pour bien démarrer',
      description:
        'Ajoutez votre premier apprenant et fixez votre rendez-vous de suivi hebdomadaire. Chaque étape peut être passée : vous retrouverez ces actions dans « Alternants » et « Calendrier ».'
    },
    {
      id: 'premierApprenant',
      kind: 'fields',
      optional: true,
      title: 'Ajoutez votre premier apprenant',
      description:
        "Il recevra un lien d'invitation à lui transmettre pour créer son compte. S'il a déjà un compte Alternup, il est ajouté directement à votre réseau.",
      fields: [
        { name: 'inviteFirstName', label: 'Prénom', type: 'text' },
        { name: 'inviteLastName', label: 'Nom', type: 'text' },
        { name: 'inviteEmail', label: 'Adresse e-mail', type: 'email', required: true, placeholder: 'prenom.nom@exemple.com' }
      ]
    },
    {
      id: 'inviteRole',
      kind: 'single',
      required: true,
      when: hasInvite,
      title: 'Alternant ou stagiaire ?',
      options: INVITE_ROLE_OPTIONS
    },
    {
      id: 'suiviJour',
      kind: 'single',
      optional: true,
      title: 'Quel jour pour votre point de suivi hebdomadaire ?',
      description: `Un rendez-vous récurrent est placé dans votre calendrier pour les ${SUIVI_OCCURRENCES} prochaines semaines.`,
      options: WEEKDAY_OPTIONS
    },
    {
      id: 'suiviCreneau',
      kind: 'fields',
      when: (answers) => typeof answers.suiviJour === 'string' && answers.suiviJour.length > 0,
      title: 'À quelle heure ?',
      fields: [
        { name: 'suiviDebut', label: 'Début', type: 'time', required: true },
        { name: 'suiviFin', label: 'Fin', type: 'time', required: true }
      ],
      validate: (answers) =>
        String(answers.suiviFin ?? '') > String(answers.suiviDebut ?? '')
          ? null
          : "L'heure de fin doit suivre l'heure de début."
    }
  ]
}

function tutorItems(firstName: string, withActions: boolean): QuestionnaireItem[] {
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
    },
    ...(withActions ? tutorActionItems() : [])
  ]
}

/**
 * Questions posées à un rôle. `actions` (tuteur, première connexion) ajoute
 * les étapes d'invitation et de point de suivi.
 */
export function onboardingItemsFor(
  role: Role,
  firstName: string,
  options: { actions?: boolean } = {}
): QuestionnaireItem[] {
  return role === 'Tutor'
    ? tutorItems(firstName, options.actions ?? false)
    : learnerItems(role, firstName)
}

// ─── Réponses ───────────────────────────────────────────────────────────────

/** Texte libre optionnel : vide → `null`, sinon coupé à 160 caractères. */
const text = z
  .string()
  .trim()
  .max(160, '160 caractères maximum.')
  .nullish()
  .transform((v) => (v ? v : null))

/** Nombre de semaines d'un rythme « autre » : entier de 1 à 52, vide → `null`. */
const semaines = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? null : Number(v)),
  z.number().int('Nombre entier attendu.').min(1, 'Minimum 1.').max(52, 'Maximum 52.').nullable()
)

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
    rythmeSemainesEntreprise: semaines,
    rythmeSemainesEcole: semaines,
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
  'rythme',
  'rythmeSemainesEntreprise',
  'rythmeSemainesEcole'
] as const
const EN_POSTE_FIELDS = [
  'entreprise',
  'poste',
  'dateDebutContrat',
  'dateFinContrat',
  'rythme',
  'rythmeSemainesEntreprise',
  'rythmeSemainesEcole'
] as const
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
  if (result.rythme !== 'autre') {
    result.rythmeSemainesEntreprise = null
    result.rythmeSemainesEcole = null
  }
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
    push(
      'Rythme',
      p.rythme === 'autre' && p.rythmeSemainesEntreprise && p.rythmeSemainesEcole
        ? `${semainesFr(p.rythmeSemainesEntreprise)} entreprise / ${semainesFr(p.rythmeSemainesEcole)} école`
        : p.rythme && ONBOARDING_LABELS.rythme[p.rythme]
    )
  }

  if (p.objectifs.length) {
    const labels = role === 'Tutor' ? ONBOARDING_LABELS.objectifsTuteur : ONBOARDING_LABELS.objectifsApprenant
    push('Attentes', p.objectifs.map((o) => labels[o] ?? o).join(', '))
  }
  return rows
}

function semainesFr(n: number): string {
  return `${n} semaine${n > 1 ? 's' : ''}`
}

// ─── Actions du tuteur (première connexion) ─────────────────────────────────

export interface WeeklySlot {
  startTime: string
  endTime: string
}

function withTime(base: Date, hhmm: string): Date {
  const [h = 0, m = 0] = hhmm.split(':').map(Number)
  const d = new Date(base)
  d.setHours(h, m, 0, 0)
  return d
}

/**
 * Créneaux hebdomadaires à venir, en heure LOCALE du navigateur (celle du
 * calendrier) : `weekday` ISO (1 = lundi … 7 = dimanche), heures `HH:mm`.
 * Le premier créneau est le prochain qui commence après `from`. Les
 * changements d'heure été/hiver sont gérés par `setDate` en heure locale :
 * « mardi 10:00 » reste 10:00 toute l'année.
 */
export function weeklySlots(
  from: Date,
  weekday: number,
  start: string,
  end: string,
  count: number
): WeeklySlot[] {
  let first = withTime(from, start)
  first.setDate(first.getDate() + ((weekday % 7) - first.getDay() + 7) % 7)
  if (first <= from) first = new Date(first.setDate(first.getDate() + 7))

  return Array.from({ length: count }, (_, i) => {
    const day = new Date(first)
    day.setDate(first.getDate() + 7 * i)
    return {
      startTime: withTime(day, start).toISOString(),
      endTime: withTime(day, end).toISOString()
    }
  })
}

const slotSchema = z
  .object({ startTime: z.iso.datetime({ offset: true }), endTime: z.iso.datetime({ offset: true }) })
  .refine((d) => new Date(d.endTime) > new Date(d.startTime), {
    message: "L'heure de fin doit suivre l'heure de début.",
    path: ['endTime']
  })

/**
 * Actions demandées à la fin de l'onboarding tuteur (`actions` dans le corps
 * de `POST /api/onboarding`). Les créneaux arrivent déjà calculés par le
 * client : le fuseau horaire est celui du navigateur, comme pour tout
 * événement créé depuis le calendrier.
 */
export const onboardingActionsSchema = z
  .object({
    invitation: invitationCreateSchema.optional(),
    suivi: z.object({ slots: z.array(slotSchema).min(1).max(52) }).optional()
  })
  .default({})

export type OnboardingActionsInput = NonNullable<z.input<typeof onboardingActionsSchema>>

function answerText(answers: QuestionnaireAnswers, key: string): string {
  const value = answers[key]
  return typeof value === 'string' ? value.trim() : ''
}

/** Actions à envoyer au serveur d'après les réponses aux étapes d'action. */
export function onboardingActionsFrom(answers: QuestionnaireAnswers, now: Date): OnboardingActionsInput {
  const actions: OnboardingActionsInput = {}
  const email = answerText(answers, 'inviteEmail')
  if (email) {
    actions.invitation = {
      email,
      firstName: answerText(answers, 'inviteFirstName') || undefined,
      lastName: answerText(answers, 'inviteLastName') || undefined,
      role: answerText(answers, 'inviteRole') === 'Alternant' ? 'Alternant' : 'Stagiaire'
    }
  }
  const jour = Number(answerText(answers, 'suiviJour'))
  const debut = answerText(answers, 'suiviDebut')
  const fin = answerText(answers, 'suiviFin')
  if (jour >= 1 && jour <= 7 && debut && fin && fin > debut) {
    actions.suivi = { slots: weeklySlots(now, jour, debut, fin, SUIVI_OCCURRENCES) }
  }
  return actions
}

/** Compte rendu des actions exécutées, affiché sur l'écran de fin. */
export interface OnboardingActionsResult {
  invitation:
    | { kind: 'invited'; email: string; firstName: string | null; inviteUrl: string }
    | { kind: 'linked'; firstName: string; lastName: string }
    | null
  suivi: { count: number; firstStart: string; lastStart: string } | null
}

export interface OnboardingSubmitResult {
  profile: OnboardingProfileView
  actions: OnboardingActionsResult
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
