<script setup lang="ts">
import type { LayoutEvent, PositionedEvent } from '~/shared/utils/calendar-layout'
import { eventBlockStyle } from '~/shared/utils/calendar-layout'
import { formatTime } from '~/shared/utils/calendar-dates'

// Fantôme de la plage en cours de dessin : positionné par le même `layoutDay`
// que les vrais événements (il prend une place dans la colonne), sans les
// couleurs de catégorie puisqu'aucune n'est encore choisie.
const props = defineProps<{
  positioned: PositionedEvent<LayoutEvent>
}>()

const style = computed(() => eventBlockStyle(props.positioned))

const times = computed(() => {
  const { start, end } = props.positioned.event
  return `${formatTime(new Date(start))} – ${formatTime(new Date(end))}`
})
</script>

<template>
  <div
    aria-hidden="true"
    class="absolute z-20 flex flex-col items-start justify-center overflow-hidden rounded-md border-l-4 border-[var(--ui-primary)] bg-[var(--ui-primary)]/15 px-3 py-1 text-xs text-[var(--ui-text)] pointer-events-none"
    :style="style"
  >
    <span class="w-full truncate opacity-80 tabular-nums">{{ times }}</span>
  </div>
</template>
