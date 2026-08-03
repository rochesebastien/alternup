<script setup lang="ts">
// Cloche de notifications : badge du nombre d'éléments à traiter (notifications
// non lues + relances en cours). Le compteur est chargé une seule fois, au
// montage côté client (`server: false`) — pas de polling. Il est partagé via
// `useState` pour que la page /notifications puisse le remettre à jour après une
// lecture, sans requête supplémentaire.
interface UnreadCount {
  unread: number
  reminders: number
  total: number
}

const count = useNotificationCountState()

const { data } = await useFetch<UnreadCount>('/api/notifications/unread-count', {
  server: false,
  default: () => ({ unread: 0, reminders: 0, total: 0 })
})

watch(
  data,
  (value) => {
    count.value = value?.total ?? 0
  },
  { immediate: true }
)

const badge = computed<string>(() => (count.value > 99 ? '99+' : String(count.value)))
const ariaLabel = computed<string>(() =>
  count.value > 0
    ? `Notifications, ${count.value} à traiter`
    : 'Notifications'
)
</script>

<template>
  <NuxtLink
    to="/notifications"
    class="relative inline-flex items-center justify-center size-8 rounded-full text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-elevated)] transition-colors"
    :aria-label="ariaLabel"
  >
    <UIcon name="i-lucide-bell" class="size-4" />
    <span
      v-if="count > 0"
      class="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-[var(--ui-error)] text-white text-[10px] font-semibold leading-4 text-center"
    >
      {{ badge }}
    </span>
  </NuxtLink>
</template>
