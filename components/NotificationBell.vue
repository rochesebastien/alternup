<script setup lang="ts">
// Cloche de notifications : badge du nombre d'éléments à traiter (notifications
// non lues + relances en cours) et panneau déroulant listant le fil récent.
//
// Deux chargements distincts, volontairement séparés :
//   1. le COMPTEUR, chargé une seule fois au montage côté client (`server: false`)
//      — pas de polling — et partagé via `useState` avec la page /notifications ;
//   2. le FIL, chargé paresseusement à la première ouverture du panneau puis
//      rafraîchi à chaque réouverture, pour ne rien demander à l'utilisateur qui
//      ne clique jamais sur la cloche.
import { feedItemIcon, feedItemLabel, relativeTimeFr } from '~/shared/utils/notifications'
import type {
  NotificationFeed,
  NotificationItem,
  ReminderItem
} from '~/shared/utils/notifications'

interface UnreadCount {
  unread: number
  reminders: number
  total: number
}

/** Au-delà, le panneau renvoie vers /notifications plutôt que de tout lister. */
const PANEL_LIMIT = 8

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

// ─────────────────────────── Panneau ───────────────────────────

const open = ref<boolean>(false)
const loading = ref<boolean>(false)
/** Passe à vrai après le premier chargement réussi : évite de réafficher le
    squelette lors des rafraîchissements suivants. */
const loaded = ref<boolean>(false)

const notifications = ref<NotificationItem[]>([])
const reminders = ref<ReminderItem[]>([])

const recent = computed<NotificationItem[]>(() => notifications.value.slice(0, PANEL_LIMIT))
const isEmpty = computed<boolean>(
  () => reminders.value.length === 0 && notifications.value.length === 0
)

// `now` reste nul tant que le panneau n'a pas été ouvert : les dates relatives
// ne sont calculées que côté client, ce qui évite tout écart d'hydratation.
const now = ref<Date | null>(null)

function relative(value: string): string {
  return now.value === null ? '' : relativeTimeFr(value, now.value)
}

async function loadFeed(): Promise<void> {
  if (loading.value) return
  loading.value = true
  try {
    const feed = await $fetch<NotificationFeed>('/api/notifications')
    notifications.value = feed.notifications
    reminders.value = feed.reminders
    // Le fil fait autorité : on resynchronise le badge au passage.
    count.value =
      feed.notifications.filter((item) => !item.readAt).length + feed.reminders.length
    loaded.value = true
  } catch {
    // Échec silencieux : le panneau conserve le contenu déjà affiché.
  } finally {
    loading.value = false
  }
}

watch(open, (value) => {
  if (!value) return
  now.value = new Date()
  void loadFeed()
})

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
      count.value = Math.max(0, count.value - 1)
    }
    open.value = false
    if (item.link) await navigateTo(item.link)
  } finally {
    opening.value = null
  }
}
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="{ align: 'end', side: 'bottom', sideOffset: 8 }"
    :ui="{ content: 'w-96 max-w-[calc(100vw-1.5rem)]' }"
  >
    <button
      type="button"
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
    </button>

    <template #content>
      <div class="flex flex-col">
        <!-- En-tête -->
        <div
          class="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--ui-border)]"
        >
          <p class="text-sm font-semibold text-[var(--ui-text)]">Notifications</p>
          <span v-if="count > 0" class="text-xs text-[var(--ui-text-muted)]">
            {{ count }} à traiter
          </span>
        </div>

        <!-- Corps scrollable -->
        <div class="max-h-96 overflow-y-auto p-2 space-y-1">
          <p
            v-if="loading && !loaded"
            class="py-10 text-center text-sm text-[var(--ui-text-muted)]"
          >
            Chargement des notifications…
          </p>

          <template v-else>
            <p
              v-if="isEmpty"
              class="py-10 text-center text-sm text-[var(--ui-text-muted)]"
            >
              Aucune notification pour le moment.
            </p>

            <!-- Relances : échéances calculées à la volée, en tête et en style distinct -->
            <NuxtLink
              v-for="reminder in reminders"
              :key="reminder.id"
              :to="reminder.link ?? '/notifications'"
              class="flex gap-3 rounded-md border-l-2 border-l-[var(--ui-primary)] bg-[var(--ui-bg-muted)] px-3 py-2 hover:bg-[var(--ui-bg-accented)] transition-colors"
              @click="open = false"
            >
              <UIcon
                :name="feedItemIcon(reminder.type)"
                class="size-4 mt-0.5 shrink-0 text-[var(--ui-text-muted)]"
              />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-[var(--ui-text)] truncate">
                  {{ reminder.title }}
                </p>
                <p
                  v-if="reminder.body"
                  class="text-xs text-[var(--ui-text-muted)] mt-0.5 line-clamp-2"
                >
                  {{ reminder.body }}
                </p>
              </div>
              <span class="text-xs text-[var(--ui-text-dimmed)] shrink-0">
                {{ feedItemLabel(reminder.type) }}
              </span>
            </NuxtLink>

            <!-- Notifications persistées -->
            <button
              v-for="item in recent"
              :key="item.id"
              type="button"
              class="w-full flex gap-3 rounded-md px-3 py-2 text-left transition-colors"
              :class="item.readAt
                ? 'bg-transparent hover:bg-[var(--ui-bg-muted)]'
                : 'bg-[var(--ui-bg-elevated)] hover:bg-[var(--ui-bg-muted)]'"
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
                <p class="text-xs text-[var(--ui-text-dimmed)] mt-0.5">
                  {{ feedItemLabel(item.type) }}
                  <span v-if="relative(item.createdAt)"> · {{ relative(item.createdAt) }}</span>
                </p>
              </div>
              <span class="sr-only">Ouvrir la notification</span>
            </button>
          </template>
        </div>

        <!-- Pied de panneau -->
        <div class="border-t border-[var(--ui-border)] p-2">
          <NuxtLink
            to="/notifications"
            class="block rounded-md px-3 py-2 text-center text-sm font-medium text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] hover:bg-[var(--ui-bg-muted)] transition-colors"
            @click="open = false"
          >
            Voir toutes les notifications
          </NuxtLink>
        </div>
      </div>
    </template>
  </UPopover>
</template>
