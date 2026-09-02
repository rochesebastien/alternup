<template>
  <div class="flex flex-col flex-1 min-h-0">
    <div class="grid grid-cols-7 border-b border-[var(--ui-border)]">
      <div
        v-for="(weekday, index) in weekdays"
        :key="weekday + index"
        class="px-2 py-1.5 text-center text-xs font-medium text-[var(--ui-text-muted)] capitalize"
      >
        {{ weekday }}
      </div>
    </div>

    <div class="grid grid-rows-6 flex-1 min-h-0">
      <CalendarMonthWeek
        v-for="weekStart in weekStarts"
        :key="weekStart.getTime()"
        :week-start="weekStart"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { addDays } from 'date-fns'
import { formatWeekday } from '~/shared/utils/calendar-dates'

/**
 * Grille mois : en-tête des 7 jours de la semaine, puis 6 rangées fixes
 * (toujours 42 jours, voir `monthRange`) remplissant la hauteur disponible.
 * Pas de virtualisation ni de scroll infini (décision du lot).
 */

const { range } = useCalendarContext()

const weekdays = computed(() => Array.from({ length: 7 }, (_, index) => formatWeekday(addDays(range.value.start, index))))

const weekStarts = computed(() => Array.from({ length: 6 }, (_, index) => addDays(range.value.start, index * 7)))
</script>
