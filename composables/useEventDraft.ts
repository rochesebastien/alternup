import { addMinutes, startOfDay } from 'date-fns'
import { DRAG_THRESHOLD, SNAP_MINUTES, minutesInColumn } from '~/shared/utils/calendar-layout'

interface Gesture {
  day: Date
  rect: DOMRect
  x: number
  y: number
  anchorMinutes: number
  moved: boolean
}

/**
 * Dessin d'un fantôme de création par glissé sur une colonne horaire vide, et
 * ouverture de la modale de création. Adaptation de useEventDraft.ts du
 * template Nuxt UI limitée au seul cas `'timed'` (pas de rangée « journée
 * entière », pas de mois) : le jour reste celui où le geste a commencé, il n'y
 * a rien à recalculer sous le pointeur pendant le glissé.
 *
 * Instanciable une fois par colonne (`DayColumn.vue` appelle ce composable
 * directement, comme le fait le template) : l'état de geste n'a besoin
 * d'être partagé entre colonnes que via `ctx.draft`, déjà fourni par le
 * contexte injecté.
 */
export function useEventDraft() {
  const ctx = useCalendarContext()

  let gesture: Gesture | null = null

  // Les événements et la poignée de redimensionnement gèrent leurs propres
  // pointeurs ; un geste ne doit démarrer que sur une zone vraiment vide.
  function onEmptySpace(event: Event): boolean {
    return !(event.target as HTMLElement | null)?.closest('[data-event],[data-draft],a,button,[role="button"]')
  }

  function bind() {
    document.addEventListener('pointermove', onPointermove)
    document.addEventListener('pointerup', onPointerup)
    document.addEventListener('pointercancel', onPointerup)
  }

  function unbind() {
    document.removeEventListener('pointermove', onPointermove)
    document.removeEventListener('pointerup', onPointerup)
    document.removeEventListener('pointercancel', onPointerup)
  }

  function endGesture() {
    gesture = null
    unbind()
  }

  function geometry(pointerEvent: PointerEvent): { start: Date, end: Date } {
    const current = gesture!
    const day = startOfDay(current.day)
    const minutes = minutesInColumn(pointerEvent.clientY, current.rect.top)
    const from = Math.min(current.anchorMinutes, minutes)
    // Un glissé qui ne quitte jamais son pas de calage donnerait un
    // événement vide, que `layoutDay` filtrerait — rien ne se dessinerait.
    const to = Math.max(Math.max(current.anchorMinutes, minutes), from + SNAP_MINUTES)

    return { start: addMinutes(day, from), end: addMinutes(day, to) }
  }

  function onGridPointerdown(pointerEvent: PointerEvent, day: Date) {
    if (!ctx.canEdit.value || pointerEvent.button !== 0 || pointerEvent.pointerType === 'touch' || !onEmptySpace(pointerEvent)) return

    const rect = (pointerEvent.currentTarget as HTMLElement).getBoundingClientRect()

    gesture = {
      day,
      rect,
      x: pointerEvent.clientX,
      y: pointerEvent.clientY,
      anchorMinutes: minutesInColumn(pointerEvent.clientY, rect.top, 'floor'),
      moved: false
    }

    bind()
  }

  function onPointermove(pointerEvent: PointerEvent) {
    if (!gesture) return

    if (!gesture.moved) {
      // Rien n'existe tant que le pointeur n'a pas assez bougé : un simple
      // clic ne crée aucun fantôme.
      if (Math.hypot(pointerEvent.clientX - gesture.x, pointerEvent.clientY - gesture.y) < DRAG_THRESHOLD) return
      gesture.moved = true
    }

    ctx.draft.value = geometry(pointerEvent)
  }

  function onPointerup() {
    if (gesture?.moved && ctx.draft.value) {
      const { start, end } = ctx.draft.value
      ctx.onCreateRequest(start, end)
    }

    ctx.draft.value = null

    if (gesture) endGesture()
  }

  function onGridDblclick(mouseEvent: MouseEvent, day: Date) {
    if (!ctx.canEdit.value || !onEmptySpace(mouseEvent)) return

    // Sinon le second clic sélectionne le libellé d'heure sous le pointeur.
    mouseEvent.preventDefault()
    getSelection()?.removeAllRanges()

    const rect = (mouseEvent.currentTarget as HTMLElement).getBoundingClientRect()
    const minutes = minutesInColumn(mouseEvent.clientY, rect.top, 'floor')
    const start = addMinutes(startOfDay(day), minutes)

    ctx.onCreateRequest(start, addMinutes(start, 60))
  }

  useEventListener('keydown', (keyboardEvent: KeyboardEvent) => {
    // Annule le dessin en cours ; une fois la modale ouverte, c'est elle qui
    // gère Échap.
    if (keyboardEvent.key === 'Escape' && gesture?.moved) {
      ctx.draft.value = null
      endGesture()
    }
  })

  // Relâcher le pointeur hors de la fenêtre en changeant d'application ne
  // déclenche ni pointerup ni pointercancel.
  useEventListener('blur', () => {
    if (gesture) {
      ctx.draft.value = null
      endGesture()
    }
  })

  // Le composant qui a démarré le geste (DayColumn) peut être démonté en
  // plein glissé (bascule de vue via le Toolbar ou les raccourcis d/w/m/t) :
  // sans ce nettoyage, les écouteurs document posés par bind() resteraient
  // actifs et ctx.draft garderait un fantôme obsolète.
  onScopeDispose(() => {
    if (gesture) {
      ctx.draft.value = null
      endGesture()
    }
  })

  return {
    onGridPointerdown,
    onGridDblclick
  }
}
