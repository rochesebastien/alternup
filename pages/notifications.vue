<script setup lang="ts">
import {
  feedItemIcon,
  feedItemLabel,
  relativeTimeFr
} from '~/shared/utils/notifications'
import type { ReminderItem } from '~/shared/utils/notifications'

definePageMeta({})

interface NotificationItem {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  readAt: string | null
  createdAt: string
}

interface NotificationFeed {
  notifications: NotificationItem[]
  reminders: ReminderItem[]
}

const { data, refresh } = await useFetch<NotificationFeed>('/api/notifications', {
  default: () => ({ notifications: [], reminders: [] })
})

const notifications = computed<NotificationItem[]>(() => data.value?.notifications ?? [])
const reminders = computed<ReminderItem[]>(() => data.value?.reminders ?? [])

const unreadCount = computed<number>(
  () => notifications.value.filter((item) => !item.readAt).length
)

// Compteur partagé avec la cloche de la nav.
const count = useNotificationCountState()
watch(
  [unreadCount, reminders],
  () => {
    count.value = unreadCount.value + reminders.value.length
  },
  { immediate: true }
)

// `now` reste nul au rendu serveur : les dates relatives n'apparaissent qu'après
// le montage, ce qui évite tout écart d'hydratation.
const now = ref<Date | null>(null)
onMounted(() => {
  now.value = new Date()
})

function relative(value: string): string {
  return now.value === null ? '' : relativeTimeFr(value, now.value)
}

const opening = ref<string | null>(null)

async function openNotification(item: NotificationItem): Promise<void> {
  opening.value = item.id
  try {
    if (!item.readAt) {
      // Best effort : l'échec du marquage ne doit pas bloquer la navigation.
      await $fetch(`/api/notifications/${item.id}/read`, { method: 'POST' }).catch(
        () => undefined
      )
      item.readAt = new Date().toISOString()
    }
    if (item.link) await navigateTo(item.link)
  } finally {
    opening.value = null
  }
}

const markingAll = ref<boolean>(false)

async function markAllAsRead(): Promise<void> {
  markingAll.value = true
  try {
    await $fetch('/api/notifications/read-all', { method: 'POST' })
    await refresh()
  } finally {
    markingAll.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 py-10 space-y-6">
    <PageHeader
      title="Notifications"
      subtitle="Vos événements de suivi et vos échéances à traiter."
    >
      <template #actions>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-check-check"
          :disabled="unreadCount === 0"
          :loading="markingAll"
          @click="markAllAsRead"
        >
          Tout marquer comme lu
        </UButton>
      </template>
    </PageHeader>

    <!-- Relances : échéances calculées à la volée, en tête et en style distinct -->
    <section v-if="reminders.length > 0" class="space-y-2">
      <h2 class="text-xs font-semibold uppercase tracking-wide text-[var(--ui-text-dimmed)]">
        À traiter
      </h2>
      <NuxtLink
        v-for="reminder in reminders"
        :key="reminder.id"
        :to="reminder.link ?? '/notifications'"
        class="flex gap-3 rounded-lg border border-[var(--ui-border)] border-l-2 border-l-[var(--ui-primary)] bg-[var(--ui-bg-muted)] px-4 py-3 hover:bg-[var(--ui-bg-accented)] transition-colors"
      >
        <UIcon
          :name="feedItemIcon(reminder.type)"
          class="size-4 mt-0.5 shrink-0 text-[var(--ui-text-muted)]"
        />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-[var(--ui-text)]">{{ reminder.title }}</p>
          <p v-if="reminder.body" class="text-sm text-[var(--ui-text-muted)] mt-0.5">
            {{ reminder.body }}
          </p>
        </div>
        <span class="text-xs text-[var(--ui-text-dimmed)] shrink-0">
          {{ feedItemLabel(reminder.type) }}
        </span>
      </NuxtLink>
    </section>

    <!-- Notifications persistées -->
    <section class="space-y-2">
      <h2
        v-if="reminders.length > 0"
        class="text-xs font-semibold uppercase tracking-wide text-[var(--ui-text-dimmed)]"
      >
        Historique
      </h2>

      <div
        v-if="notifications.length === 0"
        class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
      >
        Aucune notification pour le moment.
      </div>

      <button
        v-for="item in notifications"
        v-else
        :key="item.id"
        type="button"
        class="w-full flex gap-3 rounded-lg border px-4 py-3 text-left transition-colors"
        :class="item.readAt
          ? 'border-[var(--ui-border)] bg-transparent hover:bg-[var(--ui-bg-muted)]'
          : 'border-[var(--ui-border-accented)] bg-[var(--ui-bg-elevated)] hover:bg-[var(--ui-bg-muted)]'"
        :disabled="opening === item.id"
        @click="openNotification(item)"
      >
        <UIcon
          :name="feedItemIcon(item.type)"
          class="size-4 mt-0.5 shrink-0"
          :class="item.readAt ? 'text-[var(--ui-text-dimmed)]' : 'text-[var(--ui-text)]'"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span
              v-if="!item.readAt"
              class="size-1.5 rounded-full bg-[var(--ui-primary)] shrink-0"
              aria-hidden="true"
            />
            <p
              class="text-sm truncate"
              :class="item.readAt
                ? 'text-[var(--ui-text-muted)]'
                : 'font-semibold text-[var(--ui-text)]'"
            >
              {{ item.title }}
            </p>
          </div>
          <p v-if="item.body" class="text-sm text-[var(--ui-text-muted)] mt-0.5">
            {{ item.body }}
          </p>
          <p class="text-xs text-[var(--ui-text-dimmed)] mt-1">
            {{ feedItemLabel(item.type) }}
            <span v-if="relative(item.createdAt)"> · {{ relative(item.createdAt) }}</span>
          </p>
        </div>
        <span class="sr-only">Ouvrir la notification</span>
      </button>
    </section>
  </div>
</template>
