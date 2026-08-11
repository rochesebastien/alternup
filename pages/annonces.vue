<script setup lang="ts">
import { Role } from '~/shared/utils/enums'
import { announcementCreateSchema } from '~/shared/utils/announcements'

definePageMeta({})

const { user } = useUserSession()
const isTutor = computed<boolean>(() => user.value?.role === Role.Tutor)

// --- Types ------------------------------------------------------------------
interface Person {
  id: string
  firstName: string
  lastName: string
}

interface TutorRecipient {
  id: string
  announcementId: string
  studentId: string
  readAt: string | null
  student: Person
}

interface TutorAnnouncement {
  id: string
  authorId: string
  title: string
  body: string
  pinned: boolean
  createdAt: string
  recipients: TutorRecipient[]
  readCount: number
  total: number
}

interface LearnerAnnouncement {
  id: string
  title: string
  body: string
  pinned: boolean
  createdAt: string
  author: { firstName: string, lastName: string }
  readAt: string | null
}

// --- Chargement -------------------------------------------------------------
const {
  data: tutorAnnouncements,
  refresh: refreshTutor
} = await useFetch<TutorAnnouncement[]>('/api/announcements', {
  default: () => [],
  immediate: isTutor.value
})

const {
  data: learnerAnnouncements,
  refresh: refreshLearner
} = await useFetch<LearnerAnnouncement[]>('/api/announcements', {
  default: () => [],
  immediate: !isTutor.value
})

// --- Tuteur : learners pour la composition ----------------------------------
interface Learner {
  id: string
  firstName: string
  lastName: string
  email: string
}

// Chargé uniquement pour le tuteur (destinataires de la composition). La fonction
// renvoie toujours une string (contrainte de type useFetch) ; `immediate` gère le déclenchement.
const { data: learners } = await useFetch<Learner[]>(
  () => `/api/tutors/${user.value?.id ?? '_'}/learners`,
  {
    default: () => [],
    immediate: isTutor.value
  }
)

const learnerItems = computed<Array<{ label: string, value: string }>>(() =>
  (learners.value ?? []).map((l) => ({
    label: `${l.firstName} ${l.lastName}`,
    value: l.id
  }))
)

// --- Tuteur : composition ---------------------------------------------------
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
    await refreshTutor()
  } catch (err: unknown) {
    composeError.value
      = (err as { data?: { message?: string } })?.data?.message
        ?? 'Impossible de publier l\'annonce.'
  } finally {
    composePending.value = false
  }
}

// --- Learner : marquer comme lues -------------------------------------------
onMounted(async () => {
  if (!import.meta.client || isTutor.value) return
  const unread = (learnerAnnouncements.value ?? []).filter((a) => !a.readAt)
  if (unread.length === 0) return
  await Promise.all(
    unread.map((a) =>
      $fetch(`/api/announcements/${a.id}/read`, { method: 'POST' }).catch(
        () => undefined
      )
    )
  )
  await refreshLearner()
})
</script>

<template>
  <div class="w-full px-6 py-10 space-y-6">
    <!-- Tuteur -------------------------------------------------------------->
    <template v-if="isTutor">
      <PageHeader
        title="Annonces"
        subtitle="Diffusez des consignes à vos alternants."
      >
        <template #actions>
          <UButton color="neutral" icon="i-lucide-plus" @click="openCompose">
            Nouvelle annonce
          </UButton>
        </template>
      </PageHeader>

      <div
        v-if="(tutorAnnouncements ?? []).length === 0"
        class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
      >
        Aucune annonce publiée pour le moment.
      </div>

      <div v-else class="space-y-4">
        <AnnouncementCard
          v-for="item in tutorAnnouncements"
          :key="item.id"
          :title="item.title"
          :body="item.body"
          :created-at="item.createdAt"
          :pinned="item.pinned"
          :read-info="`${item.readCount}/${item.total} lus`"
        />
      </div>

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
              <UTextarea
                v-model="composeState.body"
                :rows="6"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Destinataires" name="recipientIds" required>
              <USelectMenu
                v-model="composeState.recipientIds"
                multiple
                value-key="value"
                :items="learnerItems"
                placeholder="Sélectionner des alternants…"
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
              :title="composeError"
            />

            <div class="flex justify-end gap-2 pt-2">
              <UButton
                color="neutral"
                variant="ghost"
                @click="composeOpen = false"
              >
                Annuler
              </UButton>
              <UButton type="submit" color="neutral" :loading="composePending">
                Publier
              </UButton>
            </div>
          </UForm>
        </template>
      </UModal>
    </template>

    <!-- Learner ------------------------------------------------------------->
    <template v-else>
      <PageHeader title="Annonces" />

      <div
        v-if="(learnerAnnouncements ?? []).length === 0"
        class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
      >
        Vous n'avez reçu aucune annonce.
      </div>

      <div v-else class="space-y-4">
        <AnnouncementCard
          v-for="item in learnerAnnouncements"
          :key="item.id"
          :title="item.title"
          :body="item.body"
          :author="item.author"
          :created-at="item.createdAt"
          :pinned="item.pinned"
          :unread="!item.readAt"
        />
      </div>
    </template>
  </div>
</template>
