<script setup lang="ts">
import { addMinutes } from 'date-fns'
import type { CalendarDisplayEvent } from '~/shared/utils/calendar-display'
import type { PositionedEvent } from '~/shared/utils/calendar-layout'
import { MIN_EVENT_MINUTES, PX_PER_MINUTE, SNAP_MINUTES, eventBlockStyle } from '~/shared/utils/calendar-layout'
import { formatTime } from '~/shared/utils/calendar-dates'
import { calendarDotClasses, eventBlockClasses } from './category-classes'

const props = defineProps<{
  positioned: PositionedEvent<CalendarDisplayEvent>
}>()

const ctx = useCalendarContext()

const event = computed(() => props.positioned.event)
// Jamais éditable pour un pointage, même côté tuteur — recalculé par
// `ctx.isEditable`, pas dupliqué ici.
const editable = computed(() => ctx.isEditable(event.value))

const {
  dragging,
  suppressed,
  mode,
  deltaMinutes,
  deltaX,
  onPointerdown,
  onPointermove,
  onPointerup,
  onPointercancel
} = useEventDrag(event, {
  enabled: editable,
  async onCommit(start, end) {
    await ctx.onEventMove(event.value, start, end)
  }
})

const style = computed(() => {
  const height = dragging.value && mode.value === 'resize'
    ? Math.max(props.positioned.height + deltaMinutes.value * PX_PER_MINUTE, MIN_EVENT_MINUTES * PX_PER_MINUTE)
    : props.positioned.height

  return {
    ...eventBlockStyle(props.positioned, height),
    transform: dragging.value && mode.value === 'move'
      ? `translate(${deltaX.value}px, ${deltaMinutes.value * PX_PER_MINUTE}px)`
      : undefined
  }
})

// Pendant le glissé, affiche les horaires prévisualisés plutôt que ceux stockés.
const previewTimes = computed(() => {
  const shift = dragging.value && mode.value === 'move' ? deltaMinutes.value : 0
  const start = addMinutes(new Date(event.value.start), shift)
  const end = addMinutes(new Date(event.value.end), dragging.value ? (mode.value === 'resize' ? deltaMinutes.value : shift) : 0)

  return `${formatTime(start)} – ${formatTime(end > start ? end : addMinutes(start, SNAP_MINUTES))}`
})

const compact = computed(() => props.positioned.height < 40)

function onClick() {
  // Le clic qui termine un glissé ne doit pas rouvrir le détail.
  if (suppressed.value) return
  ctx.onEventClick(event.value)
}
</script>

<template>
  <button
    type="button"
    data-event
    class="absolute flex flex-col items-start justify-center overflow-hidden rounded-md border px-3 py-1 text-xs text-start transition-colors select-none touch-none focus-visible:outline-2 focus-visible:outline-[var(--ui-primary)]"
    :class="[
      eventBlockClasses[event.calendarId],
      editable ? 'cursor-grab' : 'cursor-pointer',
      dragging ? 'z-20' : 'z-[1]'
    ]"
    :style="style"
    :aria-label="`${event.title}, ${previewTimes}`"
    @click.stop="onClick"
    @pointerdown="onPointerdown"
    @pointermove="onPointermove"
    @pointerup="onPointerup"
    @pointercancel="onPointercancel"
  >
    <span class="absolute inset-y-1 left-1 w-1 rounded-full" :class="calendarDotClasses[event.calendarId]" />

    <span class="w-full pl-2 font-medium truncate">{{ event.title }}</span>
    <span v-if="!compact || dragging" class="w-full pl-2 truncate opacity-80 tabular-nums">
      {{ previewTimes }}
    </span>

    <span
      v-if="editable"
      data-resize-handle
      class="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
    />
  </button>
</template>
