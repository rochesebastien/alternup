import type { InjectionKey } from 'vue'

/** Contexte fourni par `<Questionnaire>` à ses options (`<QuestionnaireChoice>`). */
export interface QuestionnaireContext {
  /** Passe à la question suivante (ou soumet sur la dernière). */
  next: () => void
}

export const questionnaireContextKey: InjectionKey<QuestionnaireContext> = Symbol('questionnaire')

export function useQuestionnaireContext(): QuestionnaireContext | null {
  return inject(questionnaireContextKey, null)
}
