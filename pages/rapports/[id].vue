<template>
  <div class="w-full px-6 py-10 space-y-6">
    <UButton
      variant="link"
      color="neutral"
      icon="i-lucide-arrow-left"
      to="/rapports"
      class="-ml-2 px-2 text-[var(--ui-text-muted)]"
    >
      Retour aux rapports
    </UButton>

    <div v-if="status === 'pending'" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="animate-spin h-6 w-6 text-[var(--ui-text-dimmed)]" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      title="Erreur"
      :description="error.message"
    />

    <template v-else-if="report">
      <PageHeader :title="report.title" :subtitle="formatRange(report.periodStart, report.periodEnd)">
        <template #actions>
          <div class="flex items-center gap-2">
            <ReportStatusBadge :status="report.status" />
            <template v-if="canAuthorEdit">
              <UButton variant="outline" color="neutral" icon="i-lucide-pencil" @click="openEdit">
                Modifier
              </UButton>
              <UButton color="neutral" icon="i-lucide-send" :loading="submitPending" @click="onSubmit">
                Soumettre
              </UButton>
            </template>
          </div>
        </template>
      </PageHeader>

      <div class="flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <div>
          <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">Alternant</p>
          <p class="text-[var(--ui-text-toned)] mt-0.5">
            {{ report.student.firstName }} {{ report.student.lastName }}
          </p>
        </div>
        <div v-if="report.tutor">
          <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">Tuteur</p>
          <p class="text-[var(--ui-text-toned)] mt-0.5">
            {{ report.tutor.firstName }} {{ report.tutor.lastName }}
          </p>
        </div>
      </div>

      <div class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5 space-y-5">
        <section>
          <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide mb-2">Activités réalisées</p>
          <p class="text-sm text-[var(--ui-text-toned)] whitespace-pre-line">{{ report.body }}</p>
        </section>

        <section v-if="report.difficulties">
          <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide mb-2">Difficultés rencontrées</p>
          <p class="text-sm text-[var(--ui-text-toned)] whitespace-pre-line">{{ report.difficulties }}</p>
        </section>

        <section v-if="report.learnings">
          <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide mb-2">Apprentissages</p>
          <p class="text-sm text-[var(--ui-text-toned)] whitespace-pre-line">{{ report.learnings }}</p>
        </section>
      </div>

      <div
        v-if="report.tutorFeedback"
        class="rounded-lg bg-[var(--ui-bg-muted)] p-5"
      >
        <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide mb-2">Retour du tuteur</p>
        <p class="text-sm text-[var(--ui-text-toned)] whitespace-pre-line">{{ report.tutorFeedback }}</p>
      </div>

      <!-- Encart de revue (tuteur destinataire, statut soumis) -->
      <div
        v-if="canReview"
        class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5 space-y-4"
      >
        <p class="text-base font-semibold text-[var(--ui-text)]">Revue du rapport</p>
        <UFormField label="Commentaire (optionnel)">
          <UTextarea v-model="feedback" :rows="4" class="w-full" placeholder="Votre retour à l'alternant…" />
        </UFormField>

        <UAlert
          v-if="reviewError"
          color="error"
          variant="soft"
          :title="reviewError"
        />

        <div class="flex flex-wrap justify-end gap-2">
          <UButton
            variant="outline"
            color="neutral"
            icon="i-lucide-rotate-ccw"
            :loading="reviewPending && pendingDecision === 'a_revoir'"
            @click="onReview('a_revoir')"
          >
            Demander une révision
          </UButton>
          <UButton
            color="neutral"
            icon="i-lucide-check"
            :loading="reviewPending && pendingDecision === 'valide'"
            @click="onReview('valide')"
          >
            Valider
          </UButton>
        </div>
      </div>

      <DocumentSignatures
        :block="report.signatures"
        :current-user-id="user?.id ?? null"
        :pending="signPending"
        :error-message="signError"
        @sign="onSign"
      />
    </template>

    <!-- Modale d'édition (auteur) -->
    <UModal v-model:open="editOpen" title="Modifier le rapport">
      <template #body>
        <UForm
          :state="editState"
          :schema="reportCreateSchema"
          class="space-y-4"
          @submit="onEditSubmit"
        >
          <UFormField label="Titre" name="title" required>
            <UInput v-model="editState.title" class="w-full" />
          </UFormField>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Début de période" name="periodStart" required>
              <UInput v-model="editState.periodStart" type="date" class="w-full" />
            </UFormField>
            <UFormField label="Fin de période" name="periodEnd" required>
              <UInput v-model="editState.periodEnd" type="date" class="w-full" />
            </UFormField>
          </div>

          <UFormField label="Activités réalisées" name="body" required>
            <UTextarea v-model="editState.body" :rows="5" class="w-full" />
          </UFormField>

          <UFormField label="Difficultés rencontrées (optionnel)" name="difficulties">
            <UTextarea v-model="editState.difficulties" :rows="3" class="w-full" />
          </UFormField>

          <UFormField label="Apprentissages (optionnel)" name="learnings">
            <UTextarea v-model="editState.learnings" :rows="3" class="w-full" />
          </UFormField>

          <UAlert
            v-if="editError"
            color="error"
            variant="soft"
            :title="editError"
          />

          <div class="flex justify-end gap-2 pt-2">
            <UButton color="neutral" variant="ghost" @click="editOpen = false">
              Annuler
            </UButton>
            <UButton type="submit" color="neutral" :loading="editPending">
              Enregistrer
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { Role } from '~/shared/utils/enums'
import {
  reportCreateSchema,
  type ReportCreateInput,
  type ReportReviewInput
} from '~/shared/utils/progress-reports'
import type { SignatureBlock } from '~/shared/utils/signatures'

definePageMeta({})

interface PersonRef {
  id: string
  firstName: string
  lastName: string
  email?: string
}

interface ProgressReportDetail {
  id: string
  studentId: string
  tutorId: string
  periodStart: string
  periodEnd: string
  title: string
  body: string
  difficulties: string | null
  learnings: string | null
  status: string
  tutorFeedback: string | null
  submittedAt: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  student: PersonRef
  tutor: PersonRef | null
  signatures: SignatureBlock
}

const route = useRoute()
const toast = useToast()
const { user } = useUserSession()

const {
  data: report,
  status,
  error,
  refresh
} = await useFetch<ProgressReportDetail>(
  () => `/api/progress-reports/${route.params.id}`
)

const isAuthor = computed<boolean>(
  () => !!report.value && user.value?.id === report.value.studentId
)
const canAuthorEdit = computed<boolean>(
  () =>
    isAuthor.value &&
    !!report.value &&
    ['brouillon', 'a_revoir'].includes(report.value.status)
)
const canReview = computed<boolean>(
  () =>
    !!report.value &&
    user.value?.role === Role.Tutor &&
    user.value?.id === report.value.tutorId &&
    report.value.status === 'soumis'
)

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value))
}

function formatRange(startVal: string, endVal: string): string {
  return `du ${formatDate(startVal)} au ${formatDate(endVal)}`
}

/* --- Soumission (auteur) --- */
const submitPending = ref(false)

async function onSubmit() {
  if (!report.value) return
  submitPending.value = true
  try {
    await $fetch(`/api/progress-reports/${report.value.id}/submit`, {
      method: 'POST'
    })
    await refresh()
    toast.add({ title: 'Rapport soumis', color: 'success' })
  } catch (err: unknown) {
    toast.add({
      title: readErrorMessage(err) ?? 'Impossible de soumettre le rapport.',
      color: 'error'
    })
  } finally {
    submitPending.value = false
  }
}

/* --- Revue (tuteur) --- */
const feedback = ref('')
const reviewPending = ref(false)
const reviewError = ref<string | null>(null)
const pendingDecision = ref<'valide' | 'a_revoir' | null>(null)

async function onReview(decision: 'valide' | 'a_revoir') {
  if (!report.value) return
  reviewPending.value = true
  reviewError.value = null
  pendingDecision.value = decision
  const body: ReportReviewInput = {
    decision,
    feedback: feedback.value.trim() === '' ? null : feedback.value
  }
  try {
    await $fetch(`/api/progress-reports/${report.value.id}/review`, {
      method: 'POST',
      body
    })
    await refresh()
    toast.add({
      title: decision === 'valide' ? 'Rapport validé' : 'Révision demandée',
      color: 'success'
    })
  } catch (err: unknown) {
    reviewError.value = readErrorMessage(err) ?? 'Impossible d\'enregistrer la revue.'
  } finally {
    reviewPending.value = false
    pendingDecision.value = null
  }
}

/* --- Signature (tuteur ET alternant, une fois le rapport validé) --- */
const signPending = ref(false)
const signError = ref<string | null>(null)

async function onSign() {
  if (!report.value) return
  signPending.value = true
  signError.value = null
  try {
    await $fetch(`/api/progress-reports/${report.value.id}/sign`, { method: 'POST' })
    await refresh()
    toast.add({ title: 'Rapport signé', color: 'success' })
  } catch (err: unknown) {
    signError.value = readErrorMessage(err) ?? 'La signature a échoué.'
  } finally {
    signPending.value = false
  }
}

/* --- Édition (auteur) --- */
const editOpen = ref(false)
const editPending = ref(false)
const editError = ref<string | null>(null)
const editState = reactive<{
  title: string
  periodStart: string
  periodEnd: string
  body: string
  difficulties: string
  learnings: string
}>({
  title: '',
  periodStart: '',
  periodEnd: '',
  body: '',
  difficulties: '',
  learnings: ''
})

function toDateInput(value: string): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

function openEdit() {
  if (!report.value) return
  editState.title = report.value.title
  editState.periodStart = toDateInput(report.value.periodStart)
  editState.periodEnd = toDateInput(report.value.periodEnd)
  editState.body = report.value.body
  editState.difficulties = report.value.difficulties ?? ''
  editState.learnings = report.value.learnings ?? ''
  editError.value = null
  editOpen.value = true
}

async function onEditSubmit() {
  if (!report.value) return
  editPending.value = true
  editError.value = null
  const body: ReportCreateInput = {
    title: editState.title,
    periodStart: editState.periodStart,
    periodEnd: editState.periodEnd,
    body: editState.body,
    difficulties:
      editState.difficulties.trim() === '' ? null : editState.difficulties,
    learnings: editState.learnings.trim() === '' ? null : editState.learnings
  }
  try {
    await $fetch(`/api/progress-reports/${report.value.id}`, {
      method: 'PUT',
      body
    })
    editOpen.value = false
    await refresh()
    toast.add({ title: 'Rapport mis à jour', color: 'success' })
  } catch (err: unknown) {
    editError.value = readErrorMessage(err) ?? 'Impossible de mettre à jour le rapport.'
  } finally {
    editPending.value = false
  }
}

function readErrorMessage(err: unknown): string | null {
  const e = err as {
    statusMessage?: string
    data?: { statusMessage?: string; issues?: Array<{ message: string }> }
  }
  return (
    e.data?.statusMessage ||
    e.data?.issues?.[0]?.message ||
    e.statusMessage ||
    null
  )
}
</script>
