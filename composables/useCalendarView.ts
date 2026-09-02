import type { ComputedRef, Ref } from 'vue'
import {
  dayKey,
  formatRangeTitle,
  parseDayKey,
  rangeFor,
  stepDate,
  type CalendarView,
  type DateRange,
  type RangeTitle
} from '~/shared/utils/calendar-dates'

export interface UseCalendarView {
  view: Ref<CalendarView>
  date: Ref<Date>
  range: ComputedRef<DateRange>
  title: ComputedRef<RangeTitle>
  setView: (view: CalendarView) => void
  goTo: (date: Date) => void
  prev: () => void
  next: () => void
  today: () => void
}

const VALID_VIEWS: CalendarView[] = ['day', 'week', 'month']

function viewFromQuery(value: unknown): CalendarView | null {
  return typeof value === 'string' && (VALID_VIEWS as string[]).includes(value) ? (value as CalendarView) : null
}

/**
 * État vue/date du calendrier, synchronisé avec la query de l'URL courante
 * (`?view=week&date=aaaa-mm-jj`) pour que le lien soit partageable et que le
 * bouton retour du navigateur fonctionne — sans empiler d'entrées d'historique
 * à chaque navigation dans le calendrier (`router.replace`, pas `push`).
 *
 * Défauts : vue `week`, date du jour. Lecture initiale de la query faite au
 * setup, donc SSR-safe (pas de flash de la vue par défaut avant hydratation).
 */
export function useCalendarView(): UseCalendarView {
  const route = useRoute()
  const router = useRouter()

  const initialView = viewFromQuery(route.query.view) ?? 'week'
  const initialDate = (typeof route.query.date === 'string' ? parseDayKey(route.query.date) : null) ?? new Date()

  const view = ref<CalendarView>(initialView)
  const date = ref<Date>(initialDate)

  const range = computed<DateRange>(() => rangeFor(view.value, date.value))
  const title = computed<RangeTitle>(() => formatRangeTitle(view.value, date.value))

  function syncQuery(): void {
    router.replace({ query: { ...route.query, view: view.value, date: dayKey(date.value) } })
  }

  function setView(next: CalendarView): void {
    view.value = next
    syncQuery()
  }

  function goTo(next: Date): void {
    date.value = next
    syncQuery()
  }

  function prev(): void {
    goTo(stepDate(view.value, date.value, -1))
  }

  function next(): void {
    goTo(stepDate(view.value, date.value, 1))
  }

  function today(): void {
    goTo(new Date())
  }

  defineShortcuts({
    t: () => today(),
    d: () => setView('day'),
    w: () => setView('week'),
    m: () => setView('month'),
    arrowleft: () => prev(),
    arrowright: () => next()
  })

  return { view, date, range, title, setView, goTo, prev, next, today }
}
