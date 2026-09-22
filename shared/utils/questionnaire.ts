// Questionnaire « une question par écran » (composant `<Questionnaire>`), inspiré
// du composant Questionnaire de shadcn/ui : progression, raccourcis clavier,
// branchement conditionnel. Module PUR (aucune dépendance Nuxt/serveur) : la
// logique de navigation et de complétude est testée dans
// tests/shared/questionnaire.test.ts.

/** Réponse d'une question : une valeur (choix unique, champ texte) ou une liste (choix multiple). */
export type QuestionnaireAnswer = string | number | string[] | null | undefined

/**
 * Réponses indexées par identifiant : `item.id` pour les questions à choix,
 * `field.name` pour chaque champ d'une question de type `fields`.
 */
export type QuestionnaireAnswers = Record<string, QuestionnaireAnswer>

export interface QuestionnaireOption {
  value: string
  label: string
  description?: string
  icon?: string
}

export interface QuestionnaireField {
  name: string
  label: string
  type: 'text' | 'email' | 'date' | 'time' | 'number'
  placeholder?: string
  /** Bornes d'un champ `number`. */
  min?: number
  max?: number
  help?: string
  required?: boolean
  autocomplete?: string
}

interface QuestionnaireItemBase {
  id: string
  title: string
  description?: string
  /** Branchement : la question n'est posée que si le prédicat est vrai. */
  when?: (answers: QuestionnaireAnswers) => boolean
  /**
   * Étape entièrement facultative (typiquement une action : inviter, planifier) :
   * « Passer » est proposé même si des champs sont obligatoires une fois
   * l'étape entamée, et passer l'étape efface ses réponses.
   */
  optional?: boolean
  /** Contrôle propre à l'étape (cohérence entre champs) : message d'erreur ou `null`. */
  validate?: (answers: QuestionnaireAnswers) => string | null
}

export type QuestionnaireItem =
  /** Écran d'accueil ou d'information : aucune réponse attendue. */
  | (QuestionnaireItemBase & { kind: 'intro' })
  | (QuestionnaireItemBase & { kind: 'single'; required?: boolean; options: QuestionnaireOption[] })
  | (QuestionnaireItemBase & { kind: 'multiple'; required?: boolean; options: QuestionnaireOption[] })
  | (QuestionnaireItemBase & { kind: 'fields'; fields: QuestionnaireField[] })

/** Questions effectivement posées, compte tenu des réponses déjà données. */
export function visibleItems(
  items: readonly QuestionnaireItem[],
  answers: QuestionnaireAnswers
): QuestionnaireItem[] {
  return items.filter((item) => !item.when || item.when(answers))
}

function hasText(value: QuestionnaireAnswer): boolean {
  if (typeof value === 'number') return Number.isFinite(value)
  return typeof value === 'string' && value.trim().length > 0
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Message d'erreur d'un champ renseigné mais mal formé, `null` s'il est valide ou vide. */
export function fieldFormatError(field: QuestionnaireField, value: QuestionnaireAnswer): string | null {
  if (!hasText(value)) return null
  const text = String(value).trim()
  if (field.type === 'email' && !EMAIL_PATTERN.test(text)) return 'Adresse e-mail invalide.'
  if (field.type === 'number') {
    const n = Number(text)
    if (!Number.isInteger(n)) return 'Nombre entier attendu.'
    if (field.min !== undefined && n < field.min) return `Minimum ${field.min}.`
    if (field.max !== undefined && n > field.max) return `Maximum ${field.max}.`
  }
  return null
}

/** Une question à réponse obligatoire ne laisse passer que si elle est renseignée. */
export function isItemComplete(item: QuestionnaireItem, answers: QuestionnaireAnswers): boolean {
  switch (item.kind) {
    case 'intro':
      return true
    case 'single':
      return !item.required || hasText(answers[item.id])
    case 'multiple': {
      const value = answers[item.id]
      return !item.required || (Array.isArray(value) && value.length > 0)
    }
    case 'fields':
      return item.fields.every(
        (field) =>
          (!field.required || hasText(answers[field.name])) &&
          !fieldFormatError(field, answers[field.name])
      )
  }
}

/**
 * Erreur bloquante d'une étape au moment de continuer : réponse obligatoire
 * manquante, champ mal formé, puis contrôle propre à l'étape. `null` si l'on
 * peut avancer.
 */
export function itemError(item: QuestionnaireItem, answers: QuestionnaireAnswers): string | null {
  if (!isItemComplete(item, answers)) {
    if (item.kind === 'fields') {
      const malformed = item.fields
        .map((field) => fieldFormatError(field, answers[field.name]))
        .find(Boolean)
      return malformed ?? 'Merci de renseigner les champs obligatoires.'
    }
    return 'Merci de choisir une réponse pour continuer.'
  }
  return item.validate?.(answers) ?? null
}

/** Clés de réponse portées par une étape (`item.id` ou noms de ses champs). */
export function itemAnswerKeys(item: QuestionnaireItem): string[] {
  if (item.kind === 'intro') return []
  return item.kind === 'fields' ? item.fields.map((field) => field.name) : [item.id]
}

/**
 * Réponses après « Passer » : une étape `optional` est vidée (l'action qu'elle
 * porte ne sera pas exécutée), une question facultative garde sa réponse.
 */
export function answersAfterSkip(
  item: QuestionnaireItem,
  answers: QuestionnaireAnswers
): QuestionnaireAnswers {
  if (!item.optional) return answers
  const next = { ...answers }
  for (const key of itemAnswerKeys(item)) delete next[key]
  return next
}

/** Une question peut être passée si aucune de ses réponses n'est obligatoire. */
export function isItemSkippable(item: QuestionnaireItem): boolean {
  if (item.optional) return true
  switch (item.kind) {
    case 'intro':
      return false
    case 'single':
    case 'multiple':
      return !item.required
    case 'fields':
      return item.fields.every((field) => !field.required)
  }
}

/**
 * Position dans le questionnaire, écrans d'introduction exclus : « Question 2
 * sur 6 ». `index` vaut 0 sur un écran d'introduction.
 */
export function questionProgress(
  visible: readonly QuestionnaireItem[],
  currentId: string
): { index: number; total: number } {
  const questions = visible.filter((item) => item.kind !== 'intro')
  const position = questions.findIndex((item) => item.id === currentId)
  return { index: position + 1, total: questions.length }
}

/** Raccourci clavier d'une option : A, B, C… (26 options maximum). */
export function shortcutFor(index: number): string | null {
  if (index < 0 || index > 25) return null
  return String.fromCharCode(65 + index)
}

/** Réponse mise à jour après activation d'une option (clic ou raccourci). */
export function toggleChoice(
  current: QuestionnaireAnswer,
  value: string,
  multiple: boolean
): string | string[] {
  if (!multiple) return value
  const list = Array.isArray(current) ? current : []
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}
