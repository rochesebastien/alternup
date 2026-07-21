<script setup lang="ts">
interface TimelineAuthor {
  firstName: string
  lastName: string
  role?: string
}

interface TimelineItem {
  id: string
  body: string
  status?: string | null
  createdAt: string | Date
  author: TimelineAuthor
  context?: string
}

const props = defineProps<{
  items: TimelineItem[]
  emptyText?: string
}>()

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  return dateFormatter.format(date)
}

const statusLabels: Record<string, string> = {
  non_demarre: 'Non démarré',
  en_cours: 'En cours',
  termine: 'Terminé',
  annule: 'Annulé',
}

function statusLabel(status: string): string {
  return statusLabels[status] ?? status
}
</script>

<template>
  <p
    v-if="!props.items.length"
    class="text-sm text-[var(--ui-text-muted)] py-6 text-center"
  >
    {{ props.emptyText ?? 'Aucun retour pour le moment.' }}
  </p>

  <ol
    v-else
    class="relative space-y-5"
  >
    <span
      class="absolute left-1 top-1 bottom-1 w-px bg-[var(--ui-border)]"
      aria-hidden="true"
    />

    <li
      v-for="item in props.items"
      :key="item.id"
      class="relative pl-6"
    >
      <span
        class="absolute left-0 top-1.5 size-[9px] rounded-full bg-[var(--ui-bg-inverted)] ring-2 ring-[var(--ui-bg)]"
        aria-hidden="true"
      />

      <div class="flex items-baseline gap-2">
        <span class="font-medium text-[var(--ui-text)]">
          {{ item.author.firstName }} {{ item.author.lastName }}
        </span>
        <span class="text-xs text-[var(--ui-text-dimmed)]">
          {{ formatDate(item.createdAt) }}
        </span>
      </div>

      <p
        v-if="item.context"
        class="text-xs text-[var(--ui-text-muted)]"
      >
        {{ item.context }}
      </p>

      <p class="text-sm text-[var(--ui-text-toned)] whitespace-pre-line mt-1">
        {{ item.body }}
      </p>

      <UBadge
        v-if="item.status"
        color="neutral"
        variant="subtle"
        class="font-normal mt-1"
      >
        {{ statusLabel(item.status) }}
      </UBadge>
    </li>
  </ol>
</template>
