<script setup lang="ts">
import { Role } from '~/shared/utils/enums'
import type { FormSubmitEvent } from '@nuxt/ui'
import {
  periodCreateSchema,
  type PeriodCreateInput,
  type ReportCardSnapshot
} from '~/shared/utils/report-periods'

definePageMeta({})

const { user } = useUserSession()
const isTutor = computed<boolean>(() => user.value?.role === Role.Tutor)

// --- Types ------------------------------------------------------------------
interface PeriodListItem {
  id: string
  label: string
  startDate: string
  endDate: string
  closedAt: string | null
  cardsCount: number
  publishedCount: number
}

interface ReportCardItem {
  id: string
  periodId: string
  studentId: string
  generalComment: string | null
  snapshot: ReportCardSnapshot
  publishedAt: string
  createdAt: string
  updatedAt: string
  period: {
    label: string
    startDate: string
    endDate: string
  }
}

// --- Data -------------------------------------------------------------------
const {
  data: periods,
  refresh: refreshPeriods,
  error: periodsError
} = await useFetch<PeriodListItem[]>('/api/report-periods', {
  default: () => [],
  immediate: isTutor.value
})

const { data: cards, error: cardsError } = await useFetch<ReportCardItem[]>(
  '/api/report-cards',
  {
    default: () => [],
    immediate: !isTutor.value
  }
)

// --- Dates ------------------------------------------------------------------
const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' })

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value))
}

function formatRange(start: string, end: string): string {
  return `du ${formatDate(start)} au ${formatDate(end)}`
}

// --- Création période (tuteur) ---------------------------------------------
const createOpen = ref<boolean>(false)
const createPending = ref<boolean>(false)
const createError = ref<string | null>(null)

const createState = reactive<PeriodCreateInput>({
  label: '',
  startDate: '',
  endDate: ''
})

function openCreate(): void {
  createState.label = ''
  createState.startDate = ''
  createState.endDate = ''
  createError.value = null
  createOpen.value = true
}

async function onCreateSubmit(
  event: FormSubmitEvent<PeriodCreateInput>
): Promise<void> {
  createPending.value = true
  createError.value = null
  try {
    await $fetch('/api/report-periods', {
      method: 'POST',
      body: event.data
    })
    createOpen.value = false
    await refreshPeriods()
  } catch (err) {
    createError.value =
      (err as { data?: { message?: string } })?.data?.message ??
      'La création a échoué.'
  } finally {
    createPending.value = false
  }
}
</script>

<template>
  <div class="w-full px-6 py-10 space-y-6">
    <!-- Tuteur ------------------------------------------------------------->
    <template v-if="isTutor">
      <PageHeader
        title="Bulletins"
        subtitle="Périodes d'évaluation de vos alternants."
      >
        <template #actions>
          <UButton color="neutral" icon="i-lucide-plus" @click="openCreate">
            Nouvelle période
          </UButton>
        </template>
      </PageHeader>

      <UAlert
        v-if="periodsError"
        color="error"
        variant="soft"
        title="Erreur de chargement"
        :description="periodsError.message"
      />

      <div
        v-if="periods.length === 0"
        class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
      >
        Aucune période d'évaluation. Créez-en une pour commencer.
      </div>

      <ul v-else class="space-y-3">
        <li v-for="period in periods" :key="period.id">
          <NuxtLink
            :to="`/bulletins/${period.id}`"
            class="block rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5 transition-colors hover:border-[var(--ui-border-accented)]"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <p class="text-base font-semibold text-[var(--ui-text)] truncate">
                  {{ period.label }}
                </p>
                <p class="text-sm text-[var(--ui-text-muted)] mt-1">
                  {{ formatRange(period.startDate, period.endDate) }}
                </p>
              </div>
              <UBadge variant="subtle" class="font-normal shrink-0">
                {{ period.publishedCount }} bulletin(s) publié(s)
              </UBadge>
            </div>
          </NuxtLink>
        </li>
      </ul>

      <UModal v-model:open="createOpen" title="Nouvelle période">
        <template #body>
          <UForm
            :state="createState"
            :schema="periodCreateSchema"
            class="space-y-4"
            @submit="onCreateSubmit"
          >
            <UFormField label="Libellé" name="label" required>
              <UInput
                v-model="createState.label"
                class="w-full"
                placeholder="Ex. Semestre 1"
              />
            </UFormField>

            <UFormField label="Date de début" name="startDate" required>
              <UInput v-model="createState.startDate" type="date" class="w-full" />
            </UFormField>

            <UFormField label="Date de fin" name="endDate" required>
              <UInput v-model="createState.endDate" type="date" class="w-full" />
            </UFormField>

            <UAlert
              v-if="createError"
              color="error"
              variant="soft"
              :title="createError"
            />

            <div class="flex justify-end gap-2 pt-2">
              <UButton
                color="neutral"
                variant="ghost"
                @click="createOpen = false"
              >
                Annuler
              </UButton>
              <UButton type="submit" color="neutral" :loading="createPending">
                Créer
              </UButton>
            </div>
          </UForm>
        </template>
      </UModal>
    </template>

    <!-- Learner ------------------------------------------------------------->
    <template v-else>
      <PageHeader
        title="Bulletins"
        subtitle="Vos bulletins d'évaluation publiés."
      />

      <UAlert
        v-if="cardsError"
        color="error"
        variant="soft"
        title="Erreur de chargement"
        :description="cardsError.message"
      />

      <div
        v-if="cards.length === 0"
        class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
      >
        Vous n'avez pas encore de bulletin publié.
      </div>

      <div v-else class="space-y-6">
        <div
          v-for="card in cards"
          :key="card.id"
          class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5 space-y-4"
        >
          <ReportCardView
            :snapshot="card.snapshot"
            :general-comment="card.generalComment"
            :period-label="card.period.label"
          />

          <div class="flex justify-end">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-pen-line"
              :to="`/bulletins/carte/${card.id}`"
            >
              Consulter et signer
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
