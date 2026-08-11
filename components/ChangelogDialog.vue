<template>
  <UTooltip text="Nouveautés">
    <UButton
      icon="i-lucide-megaphone"
      color="neutral"
      variant="ghost"
      size="sm"
      class="rounded-full text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
      aria-label="Nouveautés de l'application"
      @click="open = true"
    />
  </UTooltip>

  <UModal v-model:open="open" title="Nouveautés">
    <template #body>
      <div class="space-y-6">
        <section v-for="entry in CHANGELOG" :key="entry.date">
          <div class="flex items-baseline justify-between gap-4">
            <h3 class="text-sm font-semibold text-[var(--ui-text)]">{{ entry.title }}</h3>
            <time
              :datetime="entry.date"
              class="shrink-0 text-xs text-[var(--ui-text-dimmed)]"
            >
              {{ formatDate(entry.date) }}
            </time>
          </div>
          <ul class="mt-2 space-y-1.5">
            <li
              v-for="item in entry.items"
              :key="item"
              class="flex gap-2 text-sm text-[var(--ui-text-muted)]"
            >
              <UIcon name="i-lucide-check" class="size-4 shrink-0 mt-0.5 text-[var(--ui-text-dimmed)]" />
              <span>{{ item }}</span>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { CHANGELOG } from '~/shared/utils/changelog'

const open = ref(false)

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
})
function formatDate(iso: string): string {
  return dateFormatter.format(new Date(`${iso}T00:00:00`))
}
</script>
