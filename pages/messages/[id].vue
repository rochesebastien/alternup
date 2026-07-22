<script setup lang="ts">
definePageMeta({})

interface Person {
  id: string
  firstName: string
  lastName: string
}

interface ChatMessage {
  id: string
  authorId: string
  body: string
  createdAt: string
}

interface ConversationThread {
  conversation: { id: string, other: Person }
  messages: ChatMessage[]
}

const route = useRoute()
const { user } = useUserSession()

const { data, refresh } = await useFetch<ConversationThread>(
  () => `/api/conversations/${route.params.id}/messages`
)

const draft = ref<string>('')
const pending = ref<boolean>(false)

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit'
})

function formatTime(value: string): string {
  return timeFormatter.format(new Date(value))
}

function isMine(message: ChatMessage): boolean {
  return message.authorId === user.value?.id
}

async function send(): Promise<void> {
  if (!draft.value.trim() || pending.value) return
  pending.value = true
  try {
    await $fetch(`/api/conversations/${route.params.id}/messages`, {
      method: 'POST',
      body: { body: draft.value }
    })
    draft.value = ''
    await refresh()
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 py-10 space-y-6">
    <div class="space-y-3">
      <UButton
        variant="link"
        color="neutral"
        icon="i-lucide-arrow-left"
        to="/messages"
        class="px-0"
      >
        Retour
      </UButton>

      <PageHeader
        v-if="data"
        :title="`${data.conversation.other.firstName} ${data.conversation.other.lastName}`"
      />
    </div>

    <div
      v-if="data && data.messages.length === 0"
      class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
    >
      Aucun message. Démarrez la conversation.
    </div>

    <div v-else-if="data" class="space-y-3">
      <div v-for="message in data.messages" :key="message.id">
        <div
          v-if="isMine(message)"
          class="ml-auto max-w-[80%] rounded-lg bg-[var(--ui-bg-inverted)] px-3 py-2 text-[var(--ui-text-inverted)]"
        >
          {{ message.body }}
        </div>
        <div
          v-else
          class="max-w-[80%] rounded-lg bg-[var(--ui-bg-muted)] px-3 py-2 text-[var(--ui-text-toned)]"
        >
          {{ message.body }}
        </div>
        <p
          class="mt-1 text-xs text-[var(--ui-text-dimmed)]"
          :class="isMine(message) ? 'text-right' : 'text-left'"
        >
          {{ formatTime(message.createdAt) }}
        </p>
      </div>
    </div>

    <div class="flex items-end gap-2">
      <UTextarea
        v-model="draft"
        :rows="2"
        placeholder="Votre message…"
        class="w-full"
      />
      <UButton
        color="neutral"
        icon="i-lucide-send"
        :loading="pending"
        @click="send"
      >
        Envoyer
      </UButton>
    </div>
  </div>
</template>
