<template>
  <div class="grid grid-cols-7 border-b border-[var(--ui-border)]">
    <div
      v-for="(cell, index) in cells"
      :key="cell.day.getTime()"
      class="min-h-0 flex flex-col overflow-hidden border-[var(--ui-border)]"
      :class="index !== 0 && 'border-s'"
      @dblclick="onEmptySpaceDblclick(cell.day, $event)"
    >
      <button
        type="button"
        class="self-end m-1 shrink-0 inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full text-xs font-semibold transition-colors"
        :class="cell.isToday
          ? 'bg-[var(--ui-primary)] text-black'
          : [
              'hover:bg-[var(--ui-bg-elevated)]',
              cell.isCurrentMonth ? 'text-[var(--ui-text)]' : 'text-[var(--ui-text-dimmed)]'
            ]"
        @click="openDay(cell.day)"
        @dblclick.stop
      >
        {{ cell.label }}
      </button>

      <div class="flex-1 min-h-0 flex flex-col gap-0.5 px-1 pb-1">
        <CalendarEventChip
          v-for="event in cell.visible"
          :key="event.id"
          :event="event"
          data-event
        />

        <UPopover v-if="cell.hiddenCount > 0" :content="{ side: 'right' }">
          <UButton
            color="neutral"
            variant="ghost"
            size="xs"
            class="justify-start px-1.5 py-0.5 text-[var(--ui-text-muted)] font-normal"
            data-event
          >
            +{{ cell.hiddenCount }}
          </UButton>

          <template #content>
            <div class="flex flex-col gap-0.5 p-2 w-64">
              <CalendarEventChip
                v-for="event in cell.events"
                :key="event.id"
                :event="event"
              />
            </div>
          </template>
        </UPopover>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { addDays } from 'date-fns'
import type { CalendarDisplayEvent } from '~/shared/utils/calendar-display'
import { formatShortMonth, isSameDayLocal } from '~/shared/utils/calendar-dates'

/**
 * Une rangée de la vue mois : 7 cellules jour, chacune avec son numéro (jour
 * courant en cercle plein) et jusqu'à `MAX_SLOTS` chips triés par heure — le
 * dernier slot devient « +N » (popover listant tous les chips du jour) au-delà.
 * Adaptation SIMPLIFIÉE du template Nuxt UI : pas de rangée « journée entière »,
 * donc pas de mise en page en colonnes CSS partagée entre les cellules — chaque
 * cellule empile ses propres chips indépendamment des autres.
 */

// Le dernier slot est réservé au bouton « +N » dès qu'il y a débordement, la
// cellule garde donc toujours de la place pour lui plutôt que de le pousser
// hors champ.
const MAX_SLOTS = 4
const CREATE_START_HOUR = 9
const CREATE_END_HOUR = 10

const props = defineProps<{ weekStart: Date }>()

const { eventsForDay, canEdit, onCreateRequest, goTo, setView, date } = useCalendarContext()

const today = new Date()

function label(day: Date): string {
  return day.getDate() === 1 ? `${formatShortMonth(day)} 1` : String(day.getDate())
}

function isCurrentMonth(day: Date): boolean {
  return day.getMonth() === date.value.getMonth() && day.getFullYear() === date.value.getFullYear()
}

const cells = computed(() => Array.from({ length: 7 }, (_, index) => {
  const day = addDays(props.weekStart, index)
  const events = [...eventsForDay(day)].sort((a, b) => a.start.localeCompare(b.start))
  const overflow = events.length > MAX_SLOTS
  const visibleCount = overflow ? MAX_SLOTS - 1 : events.length

  return {
    day,
    label: label(day),
    isToday: isSameDayLocal(day, today),
    isCurrentMonth: isCurrentMonth(day),
    events,
    visible: events.slice(0, visibleCount) as CalendarDisplayEvent[],
    hiddenCount: events.length - visibleCount
  }
}))

function openDay(day: Date): void {
  goTo(day)
  setView('day')
}

/**
 * Double-clic sur l'espace vide de la cellule (pas sur un chip / le bouton
 * « +N », marqués `data-event`, ni sur le numéro du jour, qui stoppe déjà sa
 * propagation) → création pré-remplie 9h–10h. Lecture seule pour l'apprenant.
 */
function onEmptySpaceDblclick(day: Date, event: MouseEvent): void {
  if (!canEdit.value) return
  if (event.target instanceof HTMLElement && event.target.closest('[data-event]')) return
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), CREATE_START_HOUR)
  const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), CREATE_END_HOUR)
  onCreateRequest(start, end)
}
</script>
