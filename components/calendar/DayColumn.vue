<script setup lang="ts">
import type { CalendarDisplayEvent } from '~/shared/utils/calendar-display'
import { dayKey, isSameDayLocal } from '~/shared/utils/calendar-dates'
import type { LayoutEvent, PositionedEvent } from '~/shared/utils/calendar-layout'
import { DRAFT_EVENT_ID, HOUR_HEIGHT, layoutDay } from '~/shared/utils/calendar-layout'

const props = defineProps<{
  day: Date
}>()

const ctx = useCalendarContext()
const { onGridPointerdown, onGridDblclick } = useEventDraft()

// Le fantôme de création traverse `layoutDay` avec les événements réels du
// jour : il prend une vraie place dans la colonne, comme un événement normal.
const layoutItems = computed<(CalendarDisplayEvent | LayoutEvent)[]>(() => {
  const events = ctx.eventsForDay(props.day)
  const draft = ctx.draft.value
  if (!draft || !isSameDayLocal(draft.start, props.day)) return events

  return [...events, { id: DRAFT_EVENT_ID, start: draft.start.toISOString(), end: draft.end.toISOString() }]
})

const positioned = computed(() => layoutDay(layoutItems.value, props.day))

const draftPositioned = computed(() =>
  positioned.value.find((item): item is PositionedEvent<LayoutEvent> => item.event.id === DRAFT_EVENT_ID) ?? null
)
const eventPositioned = computed(() =>
  positioned.value.filter((item): item is PositionedEvent<CalendarDisplayEvent> => item.event.id !== DRAFT_EVENT_ID)
)

const isToday = computed(() => isSameDayLocal(props.day, new Date()))

const hourLines = Array.from({ length: 23 }, (_, index) => index + 1)
</script>

<template>
  <div
    data-day-column
    :data-date="dayKey(day)"
    class="relative border-l border-[var(--ui-border)]"
    :style="{ height: `${24 * HOUR_HEIGHT}px` }"
    @pointerdown="onGridPointerdown($event, day)"
    @dblclick="onGridDblclick($event, day)"
  >
    <div
      v-for="hour in hourLines"
      :key="hour"
      class="absolute inset-x-0 border-t border-[var(--ui-border)] pointer-events-none"
      :style="{ top: `${hour * HOUR_HEIGHT}px` }"
    />

    <CalendarEventBlock
      v-for="item in eventPositioned"
      :key="item.event.id"
      :positioned="item"
    />

    <CalendarEventDraft v-if="draftPositioned" :positioned="draftPositioned" />

    <ClientOnly>
      <CalendarNowIndicator v-if="isToday" />
    </ClientOnly>
  </div>
</template>
