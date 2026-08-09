<script setup lang="ts">
definePageMeta({})

interface Person {
  id: string
  firstName: string
  lastName: string
}

interface LastMessage {
  body: string
  createdAt: string
}

interface ConversationSummary {
  id: string
  other: Person
  lastMessage: LastMessage | null
  unread: number
  updatedAt: string
}

const { data: conversations } = await useFetch<ConversationSummary[]>(
  '/api/conversations',
  { default: () => [] }
)

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value))
}

function truncate(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}
</script>

<template>
  <div class="w-full px-6 py-10 space-y-6">
    <PageHeader
      title="Messages"
      subtitle="Vos échanges avec votre tuteur / vos alternants."
    />

    <div
      v-if="(conversations ?? []).length === 0"
      class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
    >
      Aucune conversation pour le moment.
    </div>

    <div v-else class="space-y-3">
      <NuxtLink
        v-for="conv in conversations"
        :key="conv.id"
        :to="`/messages/${conv.id}`"
        class="block rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5 transition-colors hover:border-[var(--ui-border-accented)]"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <p class="font-medium text-[var(--ui-text)]">
              {{ conv.other.firstName }} {{ conv.other.lastName }}
            </p>
            <p class="mt-1 truncate text-sm text-[var(--ui-text-muted)]">
              {{ conv.lastMessage ? truncate(conv.lastMessage.body) : 'Aucun message' }}
            </p>
          </div>
          <div class="flex shrink-0 flex-col items-end gap-1">
            <UBadge
              v-if="conv.unread > 0"
              color="info"
              variant="subtle"
              class="font-normal"
            >
              {{ conv.unread }}
            </UBadge>
            <span
              v-if="conv.lastMessage"
              class="text-xs text-[var(--ui-text-dimmed)]"
            >
              {{ formatDate(conv.lastMessage.createdAt) }}
            </span>
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
