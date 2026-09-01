<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-2 sm:gap-4">
      <h2 class="flex items-baseline gap-1.5 min-w-0 flex-1">
        <span class="text-xl sm:text-2xl font-bold text-[var(--ui-text)] truncate capitalize">
          {{ title.months }}
        </span>
        <span class="text-sm font-normal text-[var(--ui-text-muted)] hidden sm:inline">
          {{ title.year }}
        </span>
      </h2>

      <UTabs
        :items="viewItems"
        :content="false"
        color="neutral"
        size="sm"
        :model-value="view"
        class="w-24 sm:w-48 shrink-0"
        @update:model-value="onViewChange"
      >
        <template #default="{ item }">
          <span class="sm:hidden">{{ item.label?.charAt(0) }}</span>
          <span class="hidden sm:inline">{{ item.label }}</span>
        </template>
      </UTabs>

      <div class="flex items-center gap-1 shrink-0">
        <UTooltip text="Précédent" :kbds="['arrowleft']">
          <UButton
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="ghost"
            size="sm"
            class="rounded-full"
            aria-label="Période précédente"
            @click="prev()"
          />
        </UTooltip>
        <UTooltip text="Aujourd'hui" :kbds="['t']">
          <UButton
            label="Aujourd'hui"
            color="neutral"
            variant="ghost"
            size="sm"
            class="rounded-full hidden sm:inline-flex"
            @click="today()"
          />
        </UTooltip>
        <UTooltip text="Suivant" :kbds="['arrowright']">
          <UButton
            icon="i-lucide-chevron-right"
            color="neutral"
            variant="ghost"
            size="sm"
            class="rounded-full"
            aria-label="Période suivante"
            @click="next()"
          />
        </UTooltip>
      </div>

      <div v-if="$slots.actions" class="shrink-0">
        <slot name="actions" />
      </div>
    </div>

    <div class="hidden sm:flex items-center gap-4">
      <span
        v-for="category in categories"
        :key="category.id"
        class="flex items-center gap-1.5 text-xs text-[var(--ui-text-muted)]"
      >
        <span class="size-2 rounded-full shrink-0" :class="calendarDotClasses[category.id]" />
        {{ category.label }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import type { CalendarCategoryId } from '~/shared/utils/calendar-display'
import type { CalendarView } from '~/shared/utils/calendar-dates'
import { CALENDAR_CATEGORY_LABEL, calendarDotClasses } from './category-classes'

/**
 * Barre d'outils du calendrier : titre de la période, bascule jour/semaine/mois,
 * navigation précédent/aujourd'hui/suivant, et une légende compacte des
 * catégories. Le bouton de création (« Nouvel événement ») est injecté par le
 * workspace via le slot `#actions`, pas géré ici (le tuteur seul le fournit).
 */

const { view, title, setView, prev, next, today } = useCalendarContext()

const viewItems: TabsItem[] = [
  { label: 'Jour', value: 'day' },
  { label: 'Semaine', value: 'week' },
  { label: 'Mois', value: 'month' }
]

function onViewChange(value: string | number): void {
  setView(value as CalendarView)
}

const categories = (Object.entries(CALENDAR_CATEGORY_LABEL) as [CalendarCategoryId, string][])
  .map(([id, label]) => ({ id, label }))
</script>
