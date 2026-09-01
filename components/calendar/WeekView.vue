<script setup lang="ts">
import { breakpointsTailwind } from '@vueuse/core'
import { differenceInCalendarDays } from 'date-fns'
import { eachDay, formatHour, formatWeekday, isSameDayLocal } from '~/shared/utils/calendar-dates'
import { HOUR_HEIGHT } from '~/shared/utils/calendar-layout'

// Sert aussi bien la vue jour (1 jour) que la vue semaine (7 jours) : les
// deux ne diffèrent que par `ctx.range`, résolu en amont par `useCalendarView`.
const ctx = useCalendarContext()

const isSmallScreen = useBreakpoints(breakpointsTailwind).smaller('lg')
// Ne réduit qu'après montage : le rendu serveur affiche toujours la semaine
// complète, pour que l'hydratation retombe sur le même DOM.
const mounted = useMounted()

const days = computed(() => {
  const week = eachDay(ctx.range.value)
  if (week.length <= 3 || !mounted.value || !isSmallScreen.value) return week

  // Fenêtre de 3 jours autour de la date affichée, calée pour rester dans la
  // semaine chargée.
  const start = Math.min(Math.max(differenceInCalendarDays(ctx.date.value, ctx.range.value.start), 0), week.length - 3)
  return week.slice(start, start + 3)
})

const gridStyle = computed(() => ({
  gridTemplateColumns: `3.5rem repeat(${days.value.length}, minmax(0, 1fr))`
}))

const hours = Array.from({ length: 23 }, (_, index) => index + 1)

const scroller = useTemplateRef('scroller')

// La journée s'ouvre à 7h : rien à faire au rendu serveur, le scroll ne
// prend effet qu'après montage côté client.
onMounted(() => {
  // Un peu au-dessus de la ligne de 7h : le libellé « 07:00 » est centré sur
  // cette ligne et serait sinon coupé en deux par l'en-tête des jours.
  scroller.value?.scrollTo({ top: 7 * HOUR_HEIGHT - 10 })
})

function isToday(day: Date): boolean {
  return isSameDayLocal(day, new Date())
}
</script>

<template>
  <div class="relative flex-1 flex flex-col min-h-0">
    <div ref="scroller" class="flex-1 min-h-0 overflow-y-auto">
      <!-- Colle en haut de la zone de scroll : reste visible pendant que la
        grille horaire défile en dessous. -->
      <div
        class="sticky top-0 z-10 grid border-b border-[var(--ui-border)] bg-[var(--ui-bg)]"
        :style="gridStyle"
      >
        <div />

        <div
          v-for="day in days"
          :key="day.getTime()"
          class="flex items-center justify-center gap-1.5 py-2 text-sm border-l border-[var(--ui-border)]"
        >
          <span class="text-[var(--ui-text-muted)]">{{ formatWeekday(day) }}</span>
          <span
            class="flex items-center justify-center size-6 rounded-full"
            :class="isToday(day) ? 'bg-[var(--ui-primary)] text-black font-semibold' : 'text-[var(--ui-text)]'"
          >
            {{ day.getDate() }}
          </span>
        </div>
      </div>

      <div data-week-grid class="grid" :style="gridStyle">
        <div class="relative" :style="{ height: `${24 * HOUR_HEIGHT}px` }">
          <span
            v-for="hour in hours"
            :key="hour"
            class="absolute right-2 -translate-y-1/2 text-[11px] text-[var(--ui-text-muted)] tabular-nums"
            :style="{ top: `${hour * HOUR_HEIGHT}px` }"
          >
            {{ formatHour(hour) }}
          </span>
        </div>

        <CalendarDayColumn
          v-for="day in days"
          :key="day.getTime()"
          :day="day"
        />
      </div>
    </div>
  </div>
</template>
