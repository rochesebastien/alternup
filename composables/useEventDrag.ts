import { addDays, addMinutes } from 'date-fns'
import type { CalendarDisplayEvent } from '~/shared/utils/calendar-display'
import { DRAG_THRESHOLD, PX_PER_MINUTE, SNAP_MINUTES, snapMinutes } from '~/shared/utils/calendar-layout'

export interface UseEventDragOptions {
  /** Pas de glissé du tout si faux (apprenant, ou événement de catégorie `presence`). */
  enabled: MaybeRefOrGetter<boolean>
  onCommit: (start: Date, end: Date) => void
}

/**
 * Glissé par capture de pointeur : déplace (entre colonnes de jour, via
 * `[data-week-grid]`/`[data-day-column]`) ou redimensionne (poignée basse
 * `[data-resize-handle]`) un bloc d'événement, calé sur `SNAP_MINUTES`. Le
 * bloc se translate en aperçu pendant le geste ; `onCommit` n'est appelé
 * qu'au relâchement, avec les nouvelles bornes calculées.
 *
 * Adapté de useEventDrag.ts du template Nuxt UI (mêmes noms de data-attributs,
 * même seuil `DRAG_THRESHOLD`), avec un garde `enabled` en plus : le tuteur
 * peut désactiver le glissé pour un pointage sans que l'appelant ait à
 * conditionner le montage du composant.
 */
export function useEventDrag(event: MaybeRefOrGetter<CalendarDisplayEvent>, options: UseEventDragOptions) {
  const dragging = ref(false)
  // Empêche le clic qui termine un glissé de rouvrir le détail de l'événement.
  const suppressed = ref(false)
  const mode = ref<'move' | 'resize'>('move')
  const deltaMinutes = ref(0)
  const deltaDays = ref(0)
  const deltaX = ref(0)

  let active = false
  let startX = 0
  let startY = 0
  let columnRects: DOMRect[] = []
  let columnIndex = -1

  function reset() {
    active = false
    dragging.value = false
    deltaMinutes.value = 0
    deltaDays.value = 0
    deltaX.value = 0
  }

  function onPointerdown(pointerEvent: PointerEvent) {
    if (pointerEvent.button !== 0 || !toValue(options.enabled)) return

    const target = pointerEvent.currentTarget as HTMLElement

    mode.value = (pointerEvent.target as HTMLElement).closest('[data-resize-handle]') ? 'resize' : 'move'
    startX = pointerEvent.clientX
    startY = pointerEvent.clientY

    // Mesure les colonnes de jour une seule fois par geste : c'est la source
    // de géométrie pour détecter un changement de jour.
    const grid = target.closest('[data-week-grid]')
    columnRects = grid ? [...grid.querySelectorAll('[data-day-column]')].map(column => column.getBoundingClientRect()) : []
    columnIndex = columnRects.findIndex(rect => pointerEvent.clientX >= rect.left && pointerEvent.clientX < rect.right)

    target.setPointerCapture(pointerEvent.pointerId)
    active = true
  }

  function onPointermove(pointerEvent: PointerEvent) {
    if (!active) return

    const dx = pointerEvent.clientX - startX
    const dy = pointerEvent.clientY - startY

    if (!dragging.value) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return

      dragging.value = true
      suppressed.value = true
    }

    deltaMinutes.value = snapMinutes(dy / PX_PER_MINUTE)

    if (mode.value === 'move' && columnIndex !== -1) {
      const targetIndex = columnRects.findIndex(rect => pointerEvent.clientX >= rect.left && pointerEvent.clientX < rect.right)

      if (targetIndex !== -1) {
        deltaDays.value = targetIndex - columnIndex
        deltaX.value = columnRects[targetIndex]!.left - columnRects[columnIndex]!.left
      }
    }
  }

  // Laisse passer le clic qui suit avant de réactiver le détail.
  function release() {
    setTimeout(() => {
      suppressed.value = false
    })
  }

  function onPointerup() {
    if (active) {
      if (dragging.value && (deltaMinutes.value !== 0 || deltaDays.value !== 0)) {
        const source = toValue(event)
        const start = new Date(source.start)
        const end = new Date(source.end)

        if (mode.value === 'move') {
          // `addDays` pour le pas de colonne (survit au changement d'heure
          // été/hiver), seule la partie verticale du glissé est en minutes réelles.
          const shift = (date: Date) => addMinutes(addDays(date, deltaDays.value), deltaMinutes.value)
          options.onCommit(shift(start), shift(end))
        } else {
          const resized = addMinutes(end, deltaMinutes.value)
          options.onCommit(start, resized > addMinutes(start, SNAP_MINUTES) ? resized : addMinutes(start, SNAP_MINUTES))
        }
      }

      reset()
    }

    // Tourne même après une annulation par Échap : c'est ce qui lève la
    // suppression une fois le pointeur vraiment relâché.
    release()
  }

  function onPointercancel() {
    reset()
    release()
  }

  useEventListener('keydown', (keyboardEvent: KeyboardEvent) => {
    // Annule le glissé mais garde le détail supprimé : le pointeur est
    // toujours enfoncé et le clic que son relâchement déclenchera ne doit
    // pas le rouvrir.
    if (keyboardEvent.key === 'Escape' && dragging.value) {
      reset()
    }
  })

  // Un geste peut se terminer sans événement pointeur : relâcher hors de la
  // fenêtre en changeant d'application ne déclenche ni pointerup ni
  // pointercancel, ce qui laisserait le détail supprimé indéfiniment.
  useEventListener('blur', () => {
    if (active || suppressed.value) {
      reset()
      release()
    }
  })

  return {
    dragging,
    suppressed,
    mode,
    deltaMinutes,
    deltaX,
    onPointerdown,
    onPointermove,
    onPointerup,
    onPointercancel
  }
}
