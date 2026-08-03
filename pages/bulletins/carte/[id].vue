<script setup lang="ts">
import type { ReportCardSnapshot } from '~/shared/utils/report-periods'
import type { SignatureBlock } from '~/shared/utils/signatures'

definePageMeta({})

interface PersonRef {
  id: string
  firstName: string
  lastName: string
}

interface CardDetail {
  id: string
  periodId: string
  studentId: string
  generalComment: string | null
  snapshot: ReportCardSnapshot | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  period: {
    id: string
    label: string
    startDate: string
    endDate: string
    tutorId: string
    tutor: PersonRef
  }
  student: PersonRef
  signatures: SignatureBlock
}

const route = useRoute()
const toast = useToast()
const { user } = useUserSession()

const { data: card, status, error, refresh } = await useFetch<CardDetail>(
  () => `/api/report-cards/${route.params.id}`
)

const emptySnapshot: ReportCardSnapshot = {
  courses: [],
  overallAverage: null,
  attendance: { total: 0, present: 0, absent: 0, retard: 0, excuse: 0, rate: null }
}

const snapshot = computed<ReportCardSnapshot>(() => card.value?.snapshot ?? emptySnapshot)

const studentName = computed<string>(() =>
  card.value ? `${card.value.student.firstName} ${card.value.student.lastName}` : ''
)

const tutorName = computed<string>(() =>
  card.value ? `${card.value.period.tutor.firstName} ${card.value.period.tutor.lastName}` : ''
)

/* --- Dates --- */
const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

function formatDate(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : dateFormatter.format(date)
}

const periodRange = computed<string>(() =>
  card.value
    ? `du ${formatDate(card.value.period.startDate)} au ${formatDate(card.value.period.endDate)}`
    : ''
)

/* --- Signature --- */
const signPending = ref(false)
const signError = ref<string | null>(null)

async function onSign(): Promise<void> {
  if (!card.value) return
  signPending.value = true
  signError.value = null
  try {
    await $fetch(`/api/report-cards/${card.value.id}/sign`, { method: 'POST' })
    await refresh()
    toast.add({ title: 'Bulletin signé', color: 'success' })
  } catch (err: unknown) {
    signError.value = readErrorMessage(err) ?? 'La signature a échoué.'
  } finally {
    signPending.value = false
  }
}

/* --- Export PDF (impression navigateur, aucune lib externe) --- */
function onPrint(): void {
  if (import.meta.client) window.print()
}

function readErrorMessage(err: unknown): string | null {
  const e = err as { statusMessage?: string; data?: { statusMessage?: string } }
  return e.data?.statusMessage || e.statusMessage || null
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 py-10 space-y-6 print:max-w-none print:px-0 print:py-0">
    <UButton
      variant="link"
      color="neutral"
      icon="i-lucide-arrow-left"
      to="/bulletins"
      class="-ml-2 px-2 text-[var(--ui-text-muted)] print:hidden"
    >
      Retour aux bulletins
    </UButton>

    <div v-if="status === 'pending'" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="animate-spin h-6 w-6 text-[var(--ui-text-dimmed)]" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      title="Bulletin introuvable"
      description="Ce bulletin n'existe pas ou ne vous est pas accessible."
    />

    <template v-else-if="card">
      <!-- En-tête imprimé (masqué à l'écran) -->
      <div class="print-only border-b border-[var(--ui-border)] pb-3 mb-6">
        <p class="text-lg font-extrabold tracking-tight">alternup</p>
        <p class="text-xs uppercase tracking-wide text-[var(--ui-text-muted)]">
          Bulletin périodique
        </p>
      </div>

      <PageHeader :title="`Bulletin ${card.period.label}`" :subtitle="periodRange">
        <template #actions>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-printer"
            class="print:hidden"
            @click="onPrint"
          >
            Exporter en PDF
          </UButton>
        </template>
      </PageHeader>

      <!-- Identité -->
      <dl
        class="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm print-avoid-break"
      >
        <div>
          <dt class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
            Alternant
          </dt>
          <dd class="text-[var(--ui-text-toned)] mt-0.5">{{ studentName }}</dd>
        </div>
        <div>
          <dt class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
            Tuteur
          </dt>
          <dd class="text-[var(--ui-text-toned)] mt-0.5">{{ tutorName }}</dd>
        </div>
        <div>
          <dt class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
            Période
          </dt>
          <dd class="text-[var(--ui-text-toned)] mt-0.5">{{ periodRange }}</dd>
        </div>
        <div>
          <dt class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
            Publié le
          </dt>
          <dd class="text-[var(--ui-text-toned)] mt-0.5">
            {{ formatDate(card.publishedAt) }}
          </dd>
        </div>
      </dl>

      <div
        class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5 print:border-0 print:p-0"
      >
        <ReportCardDocument
          :snapshot="snapshot"
          :general-comment="card.generalComment"
        />
      </div>

      <DocumentSignatures
        :block="card.signatures"
        :current-user-id="user?.id ?? null"
        :pending="signPending"
        :error-message="signError"
        @sign="onSign"
      />

      <p class="print-only text-xs text-[var(--ui-text-dimmed)] pt-4">
        Document généré par Alternup. Les signatures ci-dessus sont horodatées
        et conservées en base.
      </p>
    </template>
  </div>
</template>
