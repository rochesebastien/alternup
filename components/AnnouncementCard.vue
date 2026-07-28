<script setup lang="ts">
interface Props {
  title: string
  body: string
  author?: { firstName: string, lastName: string }
  createdAt: string
  pinned?: boolean
  unread?: boolean
  readInfo?: string
}

const props = defineProps<Props>()

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short'
})

const formattedDate = computed<string>(() =>
  dateFormatter.format(new Date(props.createdAt))
)

const authorName = computed<string | null>(() =>
  props.author ? `${props.author.firstName} ${props.author.lastName}` : null
)
</script>

<template>
  <div class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 space-y-1">
        <div
          v-if="pinned"
          class="flex items-center gap-1 text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide"
        >
          <UIcon name="i-lucide-pin" class="size-3.5" />
          <span>Épinglé</span>
        </div>
        <h3 class="text-base font-semibold text-[var(--ui-text)]">
          {{ title }}
        </h3>
      </div>
      <UBadge
        v-if="unread"
        color="info"
        variant="subtle"
        class="font-normal shrink-0"
      >
        Nouveau
      </UBadge>
    </div>

    <p class="mt-3 whitespace-pre-line text-sm text-[var(--ui-text-toned)]">
      {{ body }}
    </p>

    <div class="mt-4 flex items-center justify-between gap-3 text-xs text-[var(--ui-text-muted)]">
      <span>
        <template v-if="authorName">{{ authorName }} · </template>{{ formattedDate }}
      </span>
      <span v-if="readInfo" class="shrink-0">{{ readInfo }}</span>
    </div>
  </div>
</template>
