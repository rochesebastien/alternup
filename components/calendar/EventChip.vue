<template>
  <button
    type="button"
    class="w-full flex items-center gap-1.5 min-w-0 rounded-full border px-1.5 py-0.5 text-xs text-start transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-primary)]"
    :class="eventBlockClasses[props.event.calendarId]"
    :aria-label="ariaLabel"
    @click.stop="onEventClick(props.event)"
  >
    <span class="size-1.5 rounded-full shrink-0" :class="calendarDotClasses[props.event.calendarId]" />
    <span class="font-medium truncate">{{ props.event.title }}</span>
    <span class="ms-auto shrink-0 tabular-nums text-[11px] opacity-80 hidden lg:inline">
      {{ formatTime(new Date(props.event.start)) }}
    </span>
  </button>
</template>

<script setup lang="ts">
import type { CalendarDisplayEvent } from '~/shared/utils/calendar-display'
import { formatTime } from '~/shared/utils/calendar-dates'
import { calendarDotClasses, eventBlockClasses } from './category-classes'

/**
 * Pastille d'événement de la vue mois. Pas de glisser-déposer ici (décision du
 * lot) : le déplacement se fait uniquement dans la grille horaire (jour/semaine).
 */
const props = defineProps<{ event: CalendarDisplayEvent }>()

const { onEventClick } = useCalendarContext()

const ariaLabel = computed(() => `${props.event.title}, ${formatTime(new Date(props.event.start))}`)
</script>
