import { Role } from '~/shared/utils/enums'

/**
 * « Apprenant suivi » : le tuteur choisit dans la barre de navigation la
 * personne sur laquelle il veut travailler, et toutes les pages de Suivi
 * (présences, rapports, visites, compétences, annonces, messages) se limitent
 * à elle. Sans sélection, les pages affichent tout le monde comme avant.
 *
 * Le choix vit dans un cookie et non dans un `useState` : il est ainsi connu
 * dès le rendu serveur (pas de clignotement « tout le monde » puis filtrage à
 * l'hydratation) et survit à un rechargement complet.
 */
export interface FocusLearner {
  id: string
  firstName: string
  lastName: string
  role: string
}

const FOCUS_COOKIE = 'alternup-focus'
const FOCUS_MAX_AGE = 60 * 60 * 24 * 180

export function useLearnerFocus() {
  const { user } = useUserSession()
  const isTutor = computed<boolean>(() => user.value?.role === Role.Tutor)

  const focusId = useCookie<string | null>(FOCUS_COOKIE, {
    default: () => null,
    sameSite: 'lax',
    path: '/',
    maxAge: FOCUS_MAX_AGE
  })

  // Clef fixe : la liste est partagée entre la barre de navigation et les pages,
  // une seule requête est émise même si plusieurs composants l'utilisent.
  const { data } = useFetch<FocusLearner[]>(
    () => `/api/tutors/${user.value?.id ?? '_'}/learners`,
    {
      key: 'learner-focus-list',
      default: () => [],
      immediate: isTutor.value
    }
  )

  const learners = computed<FocusLearner[]>(() => data.value ?? [])

  // Un apprenant retiré du suivi ne doit pas laisser un filtre fantôme actif :
  // tant qu'il n'est pas dans la liste, on retombe sur « tous les apprenants ».
  const focus = computed<FocusLearner | null>(() =>
    focusId.value ? learners.value.find((l) => l.id === focusId.value) ?? null : null
  )

  const focusName = computed<string | null>(() =>
    focus.value ? `${focus.value.firstName} ${focus.value.lastName}` : null
  )

  function setFocus(id: string | null): void {
    focusId.value = id || null
  }

  /**
   * Vrai si l'élément concerne l'apprenant suivi — ou si aucun n'est
   * sélectionné, auquel cas rien n'est filtré.
   */
  function matchesFocus(studentId?: string | null): boolean {
    if (!focus.value) return true
    return studentId === focus.value.id
  }

  /** Filtre une liste sur l'apprenant suivi, via l'accès à son identifiant. */
  function filterByFocus<T>(items: T[], studentIdOf: (item: T) => string | null | undefined): T[] {
    if (!focus.value) return items
    return items.filter((item) => studentIdOf(item) === focus.value?.id)
  }

  return { isTutor, learners, focusId, focus, focusName, setFocus, matchesFocus, filterByFocus }
}
