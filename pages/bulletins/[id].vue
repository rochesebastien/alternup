<script setup lang="ts">
import { Role } from '@prisma/client'
import type { ReportCardSnapshot } from '~/shared/utils/report-periods'

definePageMeta({
  middleware: ['role'],
  requireRole: Role.Tutor
})

const route = useRoute()
const periodId = computed<string>(() => String(route.params.id))

// --- Types ------------------------------------------------------------------
interface Learner {
  id: string
  firstName: string
  lastName: string
}

interface Period {
  id: string
  tutorId: string
  label: string
  startDate: string
  endDate: string
  closedAt: string | null
  createdAt: string
}

interface Card {
  id: string
  periodId: string
  studentId: string
  generalComment: string | null
  snapshot: ReportCardSnapshot
  publishedAt: string
  createdAt: string
  updatedAt: string
  student: Learner
}

interface PeriodDetail {
  period: Period
  cards: Card[]
  learners: Learner[]
}

// --- Data -------------------------------------------------------------------
const { data, status, error, refresh } = await useFetch<PeriodDetail>(
  () => `/api/report-periods/${periodId.value}`
)

const learners = computed<Learner[]>(() => data.value?.learners ?? [])
const cards = computed<Card[]>(() => data.value?.cards ?? [])

function cardFor(studentId: string): Card | undefined {
  return cards.value.find((c: Card) => c.studentId === studentId)
}

function fullName(person: Learner): string {
  return `${person.firstName} ${person.lastName}`
}

// --- Dates ------------------------------------------------------------------
const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' })

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value))
}

const periodRange = computed<string>(() => {
  if (!data.value) return ''
  return `${formatDate(data.value.period.startDate)} — ${formatDate(data.value.period.endDate)}`
})

// --- Publication ------------------------------------------------------------
const publishOpen = ref<boolean>(false)
const publishPending = ref<boolean>(false)
const publishError = ref<string | null>(null)
const publishComment = ref<string>('')
const publishTarget = ref<Learner | null>(null)

function openPublish(learner: Learner): void {
  publishTarget.value = learner
  publishComment.value = cardFor(learner.id)?.generalComment ?? ''
  publishError.value = null
  publishOpen.value = true
}

async function onPublishSubmit(): Promise<void> {
  if (!publishTarget.value) return
  publishPending.value = true
  publishError.value = null
  try {
    await $fetch(`/api/report-periods/${periodId.value}/publish`, {
      method: 'POST',
      body: {
        studentId: publishTarget.value.id,
        generalComment: publishComment.value.trim() || null
      }
    })
    publishOpen.value = false
    await refresh()
  } catch (err) {
    publishError.value =
      (err as { data?: { message?: string } })?.data?.message ??
      'La publication a échoué.'
  } finally {
    publishPending.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-6 py-10 space-y-6">
    <UButton
      variant="link"
      color="neutral"
      icon="i-lucide-arrow-left"
      to="/bulletins"
      class="px-0"
    >
      Retour aux périodes
    </UButton>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Erreur de chargement"
      :description="error.message"
    />

    <div v-if="status === 'pending'" class="flex justify-center py-12">
      <UIcon
        name="i-lucide-loader-2"
        class="animate-spin h-6 w-6 text-[var(--ui-text-dimmed)]"
      />
    </div>

    <template v-else-if="data">
      <PageHeader :title="data.period.label" :subtitle="periodRange" />

      <div
        v-if="learners.length === 0"
        class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
      >
        Aucun alternant dans votre réseau.
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="learner in learners"
          :key="learner.id"
          class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5 space-y-4"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="text-base font-semibold text-[var(--ui-text)]">
                {{ fullName(learner) }}
              </p>
              <p class="text-sm text-[var(--ui-text-muted)] mt-1">
                <template v-if="cardFor(learner.id)">
                  Bulletin publié le
                  {{ formatDate(cardFor(learner.id)!.publishedAt) }}
                </template>
                <template v-else>Pas encore de bulletin</template>
              </p>
            </div>
            <UButton
              color="neutral"
              :variant="cardFor(learner.id) ? 'outline' : 'solid'"
              class="shrink-0"
              @click="openPublish(learner)"
            >
              {{ cardFor(learner.id) ? 'Republier' : 'Publier' }}
            </UButton>
          </div>

          <ReportCardView
            v-if="cardFor(learner.id)"
            :snapshot="cardFor(learner.id)!.snapshot"
            :general-comment="cardFor(learner.id)!.generalComment"
          />
        </div>
      </div>
    </template>

    <UModal
      v-model:open="publishOpen"
      :title="
        publishTarget
          ? `Publier le bulletin — ${fullName(publishTarget)}`
          : 'Publier le bulletin'
      "
    >
      <template #body>
        <form class="space-y-4" @submit.prevent="onPublishSubmit">
          <UFormField label="Appréciation générale (optionnelle)" name="generalComment">
            <UTextarea
              v-model="publishComment"
              :rows="5"
              class="w-full"
              placeholder="Commentaire visible par l'alternant…"
            />
          </UFormField>

          <UAlert
            v-if="publishError"
            color="error"
            variant="soft"
            :title="publishError"
          />

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="publishOpen = false"
            >
              Annuler
            </UButton>
            <UButton type="submit" color="neutral" :loading="publishPending">
              Publier
            </UButton>
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>
