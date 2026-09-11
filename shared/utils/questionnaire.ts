// Questionnaire « une question par écran » (composant `<Questionnaire>`), inspiré
// du composant Questionnaire de shadcn/ui : progression, raccourcis clavier,
// branchement conditionnel. Module PUR (aucune dépendance Nuxt/serveur) : la
// logique de navigation et de complétude est testée dans
// tests/shared/questionnaire.test.ts.

/** Réponse d'une question : une valeur (choix unique, champ texte) ou une liste (choix multiple). */
export type QuestionnaireAnswer = string | string[] | null | undefined

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
  type: 'text' | 'date'
  placeholder?: string
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
  return typeof value === 'string' && value.trim().length > 0
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
      return item.fields.every((field) => !field.required || hasText(answers[field.name]))
  }
}

/** Une question peut être passée si aucune de ses réponses n'est obligatoire. */
export function isItemSkippable(item: QuestionnaireItem): boolean {
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
