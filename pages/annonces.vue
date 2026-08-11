<script setup lang="ts">
import { Role } from '~/shared/utils/enums'
import {
  announcementCreateSchema,
  partitionAnnouncements,
  unreadAnnouncements,
  type NetworkAnnouncement
} from '~/shared/utils/announcements'

definePageMeta({})

const { user } = useUserSession()
const isTutor = computed<boolean>(() => user.value?.role === Role.Tutor)

// --- Chargement -------------------------------------------------------------
// Une seule liste pour tous les rôles : les annonces publiées et les annonces
// reçues arrivent ensemble, l'API les distingue par `mine`.
const { data: announcementsData, refresh } = await useFetch<NetworkAnnouncement[]>(
  '/api/announcements',
  { default: () => [] }
)
const announcements = computed<NetworkAnnouncement[]>(() => announcementsData.value ?? [])

const received = computed<NetworkAnnouncement[]>(
  () => partitionAnnouncements(announcements.value).received
)
const sent = computed<NetworkAnnouncement[]>(
  () => partitionAnnouncements(announcements.value).sent
)

// --- Destinataires possibles (réseau de l'utilisateur) ----------------------
interface NetworkPerson {
  id: string
  firstName: string
  lastName: string
  role: string
}

const { data: network } = await useFetch<NetworkPerson[]>('/api/network', {
  default: () => []
})

const recipientItems = computed<Array<{ label: string, value: string }>>(() =>
  (network.value ?? []).map((p) => ({ label: `${p.firstName} ${p.lastName}`, value: p.id }))
)

const recipientPlaceholder = computed<string>(() =>
  isTutor.value ? 'Sélectionner des alternants ou stagiaires…' : 'Sélectionner un tuteur…'
)

const emptyNetworkHint = computed<string>(() =>
  isTutor.value
    ? 'Ajoutez un alternant ou un stagiaire à votre réseau pour publier une annonce.'
    : 'Vous devez être rattaché à un tuteur pour publier une annonce.'
)

// --- Composition ------------------------------------------------------------
const composeOpen = ref<boolean>(false)
const composePending = ref<boolean>(false)
const composeError = ref<string | null>(null)

const composeState = reactive<{
  title: string
  body: string
  recipientIds: string[]
  pinned: boolean
}>({
  title: '',
  body: '',
  recipientIds: [],
  pinned: false
})

function resetCompose(): void {
  composeState.title = ''
  composeState.body = ''
  composeState.recipientIds = []
  composeState.pinned = false
  composeError.value = null
}

function openCompose(): void {
  resetCompose()
  composeOpen.value = true
}

async function onComposeSubmit(): Promise<void> {
  composePending.value = true
  composeError.value = null
  try {
    await $fetch('/api/announcements', {
      method: 'POST',
      body: {
        title: composeState.title,
        body: composeState.body,
        recipientIds: composeState.recipientIds,
        pinned: composeState.pinned
      }
    })
    composeOpen.value = false
    resetCompose()
    await refresh()
  } catch (err: unknown) {
    const e = err as {
      statusMessage?: string
      data?: { message?: string, statusMessage?: string, issues?: Array<{ message: string }> }
    }
    composeError.value
      = e.data?.statusMessage
        || e.data?.issues?.[0]?.message
        || e.data?.message
        || e.statusMessage
        || 'Impossible de publier l\'annonce.'
  } finally {
    composePending.value = false
  }
}

// --- Accusés de lecture ------------------------------------------------------
onMounted(async () => {
  const unread = unreadAnnouncements(announcements.value)
  if (unread.length === 0) return
  await Promise.all(
    unread.map((a) =>
      $fetch(`/api/announcements/${a.id}/read`, { method: 'POST' }).catch(() => undefined)
    )
  )
  await refresh()
})
</script>

<template>
  <div class="w-full px-6 py-10 space-y-6">
    <PageHeader
      title="Annonces"
      subtitle="Les annonces échangées avec votre réseau, dans les deux sens."
    >
      <template #actions>
        <UButton
          color="neutral"
          icon="i-lucide-plus"
          label="Nouvelle annonce"
          :disabled="recipientItems.length === 0"
          @click="openCompose"
        />
      </template>
    </PageHeader>

    <p
      v-if="recipientItems.length === 0"
      class="text-sm text-[var(--ui-text-muted)]"
    >
      {{ emptyNetworkHint }}
    </p>

    <!-- Reçues -->
    <section class="space-y-3">
      <h2 class="text-base font-semibold text-[var(--ui-text)]">Reçues</h2>
      <div
        v-if="received.length === 0"
        class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
      >
        Vous n'avez reçu aucune annonce.
      </div>
      <AnnouncementCard
        v-for="item in received"
        :key="item.id"
        :title="item.title"
        :body="item.body"
        :author="item.author"
        :created-at="item.createdAt"
        :pinned="item.pinned"
        :unread="!item.readAt"
      />
    </section>

    <!-- Publiées -->
    <section v-if="sent.length" class="space-y-3">
      <h2 class="text-base font-semibold text-[var(--ui-text)]">Publiées par moi</h2>
      <AnnouncementCard
        v-for="item in sent"
        :key="item.id"
        :title="item.title"
        :body="item.body"
        :created-at="item.createdAt"
        :pinned="item.pinned"
        :read-info="`${item.readCount}/${item.total} lus`"
      />
    </section>

    <UModal v-model:open="composeOpen" title="Nouvelle annonce">
      <template #body>
        <UForm
          :state="composeState"
          :schema="announcementCreateSchema"
          class="space-y-4"
          @submit="onComposeSubmit"
        >
          <UFormField label="Titre" name="title" required>
            <UInput v-model="composeState.title" class="w-full" />
          </UFormField>

          <UFormField label="Contenu" name="body" required>
            <UTextarea v-model="composeState.body" :rows="6" class="w-full" />
          </UFormField>

          <UFormField label="Destinataires" name="recipientIds" required>
            <USelectMenu
              v-model="composeState.recipientIds"
              multiple
              value-key="value"
              :items="recipientItems"
              :placeholder="recipientPlaceholder"
              class="w-full"
            />
          </UFormField>

          <UFormField name="pinned">
            <UCheckbox v-model="composeState.pinned" label="Épingler l'annonce" />
          </UFormField>

          <UAlert
            v-if="composeError"
            color="error"
            variant="soft"
            icon="i-lucide-triangle-alert"
            :title="composeError"
          />

          <div class="flex justify-end gap-2 pt-2">
            <UButton color="neutral" variant="ghost" label="Annuler" @click="composeOpen = false" />
            <UButton type="submit" color="neutral" label="Publier" :loading="composePending" />
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>
