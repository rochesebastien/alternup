import type { ComputedRef, InjectionKey, Ref, ShallowRef } from 'vue'
import type { CalendarDisplayEvent } from '~/shared/utils/calendar-display'
import { bucketByDay } from '~/shared/utils/calendar-layout'
import type { CalendarView, DateRange, RangeTitle } from '~/shared/utils/calendar-dates'
import { dayKey } from '~/shared/utils/calendar-dates'

/** Fantôme de création en cours de dessin (glissé sur la grille horaire). */
export interface CalendarDraft {
  start: Date
  end: Date
}

/**
 * Contexte partagé par les vues du calendrier (jour/semaine/mois) : état de
 * navigation, flux d'événements déjà fusionné (événements + pointages) et
 * points d'entrée vers les modales existantes du workspace. Fourni une seule
 * fois par `CalendarWorkspace.vue`, consommé par les composants `calendar/`.
 */
export interface CalendarContext {
  view: Ref<CalendarView>
  date: Ref<Date>
  range: ComputedRef<DateRange>
  title: ComputedRef<RangeTitle>
  setView: (view: CalendarView) => void
  goTo: (date: Date) => void
  prev: () => void
  next: () => void
  today: () => void

  /** Flux fusionné : événements libres/sessions/visites + pointages. */
  events: Ref<CalendarDisplayEvent[]>
  /** Événements couvrant `day`, via un bucket par jour mémoïsé sur `events`. */
  eventsForDay: (day: Date) => CalendarDisplayEvent[]

  /** Vrai pour le tuteur : seul rôle pouvant créer/déplacer/redimensionner. */
  canEdit: Ref<boolean>
  /** `canEdit` et l'événement n'est pas un pointage (jamais déplaçable). */
  isEditable: (event: CalendarDisplayEvent) => boolean

  /** Fantôme de création en cours (glissé sur la grille) ; `null` sinon. */
  draft: ShallowRef<CalendarDraft | null>

  /** Ouvre le détail d'un événement (modales existantes du workspace). */
  onEventClick: (event: CalendarDisplayEvent) => void
  /**
   * Persiste un déplacement/redimensionnement. `false` indique un échec :
   * l'appelant doit remettre l'événement à sa place (la vue se resynchronise
   * au prochain rafraîchissement des données).
   */
  onEventMove: (event: CalendarDisplayEvent, start: Date, end: Date) => Promise<boolean>
  /** Ouvre la modale de création, pré-remplie avec la plage dessinée. */
  onCreateRequest: (start: Date, end: Date) => void
}

export const CALENDAR_CONTEXT_KEY: InjectionKey<CalendarContext> = Symbol('calendar-context')

export function provideCalendarContext(ctx: CalendarContext): void {
  provide(CALENDAR_CONTEXT_KEY, ctx)
}

export function useCalendarContext(): CalendarContext {
  const ctx = inject(CALENDAR_CONTEXT_KEY)
  if (!ctx) {
    throw new Error('useCalendarContext() doit être appelé sous un composant qui appelle provideCalendarContext().')
  }
  return ctx
}

/**
 * Construit `eventsForDay` à partir d'un `Ref<CalendarDisplayEvent[]>` : le
 * bucket par jour est recalculé une seule fois par changement de `events`
 * (pas à chaque appel), pour que les vues qui itèrent sur plusieurs jours
 * ne relancent pas `bucketByDay` par jour affiché.
 */
export function useEventsForDay(events: Ref<CalendarDisplayEvent[]>): (day: Date) => CalendarDisplayEvent[] {
  const buckets = computed(() => bucketByDay(events.value))
  return (day: Date) => buckets.value.get(dayKey(day)) ?? []
}
