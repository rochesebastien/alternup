<script setup lang="ts">
import { relativeTimeFr } from '~/shared/utils/notifications'
import { overviewEventMeta, type OverviewEvent } from '~/shared/utils/overview'

const props = defineProps<{
  items: OverviewEvent[]
  emptyText?: string
}>()

/**
 * `now` reste nul au rendu serveur : les dates relatives n'apparaissent qu'après
 * le montage, ce qui évite tout écart d'hydratation (cf. `pages/notifications.vue`).
 */
const now = ref<Date | null>(null)
onMounted(() => {
  now.value = new Date()
})

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
})

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value))
}

function relative(value: string): string {
  return now.value === null ? '' : relativeTimeFr(value, now.value)
}

/** Couleur d'icône par couleur sémantique du type d'événement. */
const ICON_COLOR_CLASS: Record<string, string> = {
  neutral: 'text-[var(--ui-text-muted)]',
  primary: 'text-[var(--ui-primary)]',
  info: 'text-[var(--ui-info)]',
  success: 'text-[var(--ui-success)]',
  warning: 'text-[var(--ui-warning)]',
  error: 'text-[var(--ui-error)]'
}

function iconClass(type: string): string {
  return ICON_COLOR_CLASS[overviewEventMeta(type).color] ?? ICON_COLOR_CLASS.neutral!
}
</script>

<template>
  <p
    v-if="!props.items.length"
    class="text-sm text-[var(--ui-text-muted)] py-8 text-center"
  >
    {{ props.emptyText ?? 'Aucun événement pour le moment.' }}
  </p>

  <ol
    v-else
    class="relative space-y-1"
  >
    <span
      class="absolute left-[13px] top-3 bottom-3 w-px bg-[var(--ui-border)]"
      aria-hidden="true"
    />

    <li
      v-for="item in props.items"
      :key="item.id"
      class="relative pl-10 py-2.5"
    >
      <span
        class="absolute left-0 top-2.5 size-[27px] rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg)] flex items-center justify-center"
        aria-hidden="true"
      >
        <UIcon
          :name="overviewEventMeta(item.type).icon"
          class="size-3.5"
          :class="iconClass(item.type)"
        />
      </span>

      <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <NuxtLink
          v-if="item.link"
          :to="item.link"
          class="text-sm font-medium text-[var(--ui-text)] hover:underline underline-offset-4"
        >
          {{ item.title }}
        </NuxtLink>
        <span
          v-else
          class="text-sm font-medium text-[var(--ui-text)]"
        >
          {{ item.title }}
        </span>

        <span class="text-xs text-[var(--ui-text-dimmed)]">
          {{ overviewEventMeta(item.type).label }}
        </span>
      </div>

      <p
        v-if="item.description"
        class="text-sm text-[var(--ui-text-toned)] mt-0.5 line-clamp-3"
      >
        {{ item.description }}
      </p>

      <p class="text-xs text-[var(--ui-text-dimmed)] mt-1">
        <span>{{ formatDate(item.date) }}</span>
        <span v-if="relative(item.date)"> · {{ relative(item.date) }}</span>
      </p>
    </li>
  </ol>
</template>
