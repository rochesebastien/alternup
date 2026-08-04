<template>
  <div class="mx-auto max-w-4xl px-6 py-10 space-y-6">
    <PageHeader
      :title="isTutor ? 'Rapports d\'étape' : 'Mes rapports d\'étape'"
      :subtitle="
        isTutor
          ? 'Rapports de vos alternants à suivre.'
          : 'Vos rapports de période et leur suivi.'
      "
    >
      <template v-if="!isTutor" #actions>
        <UButton color="neutral" icon="i-lucide-plus" @click="openCreate">
          Nouveau rapport
        </UButton>
      </template>
    </PageHeader>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Erreur de chargement"
      :description="error.message"
    />

    <div v-if="isTutor && toReviewCount > 0" class="flex items-center gap-2">
      <UBadge color="info" variant="subtle" class="font-normal">
        {{ toReviewCount }} à valider
      </UBadge>
    </div>

    <div
      v-if="status === 'pending'"
      class="flex justify-center py-12"
    >
      <UIcon name="i-lucide-loader-2" class="animate-spin h-6 w-6 text-[var(--ui-text-dimmed)]" />
    </div>

    <div
      v-else-if="reports.length === 0"
      class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
    >
      {{
        isTutor
          ? 'Aucun rapport à suivre pour le moment.'
          : 'Vous n\'avez pas encore de rapport. Créez-en un pour commencer.'
      }}
    </div>

    <ul v-else class="space-y-3">
      <li v-for="report in reports" :key="report.id">
        <NuxtLink
          :to="`/rapports/${report.id}`"
          class="block rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5 transition-colors hover:border-[var(--ui-border-accented)]"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="text-base font-semibold text-[var(--ui-text)] truncate">
                {{ report.title }}
              </p>
              <p
                v-if="isTutor && report.student"
                class="text-sm text-[var(--ui-text-muted)] mt-0.5"
              >
                {{ report.student.firstName }} {{ report.student.lastName }}
              </p>
              <p class="text-sm text-[var(--ui-text-dimmed)] mt-0.5">
                {{ formatRange(report.periodStart, report.periodEnd) }}
              </p>
            </div>
            <ReportStatusBadge :status="report.status" />
          </div>
        </NuxtLink>
      </li>
    </ul>

    <UModal v-model:open="formOpen" title="Nouveau rapport d'étape">
      <template #body>
        <UForm
          :state="formState"
          :schema="reportCreateSchema"
          class="space-y-4"
          @submit="onCreateSubmit"
        >
          <UFormField label="Titre" name="title" required>
            <UInput v-model="formState.title" class="w-full" />
          </UFormField>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UFormField label="Début de période" name="periodStart" required>
              <UInput v-model="formState.periodStart" type="date" class="w-full" />
            </UFormField>
            <UFormField label="Fin de période" name="periodEnd" required>
              <UInput v-model="formState.periodEnd" type="date" class="w-full" />
            </UFormField>
          </div>

          <UFormField label="Activités réalisées" name="body" required>
            <UTextarea v-model="formState.body" :rows="5" class="w-full" />
          </UFormField>

          <UFormField label="Difficultés rencontrées (optionnel)" name="difficulties">
            <UTextarea v-model="formState.difficulties" :rows="3" class="w-full" />
          </UFormField>

          <UFormField label="Apprentissages (optionnel)" name="learnings">
            <UTextarea v-model="formState.learnings" :rows="3" class="w-full" />
          </UFormField>

          <UAlert
            v-if="formError"
            color="error"
            variant="soft"
            :title="formError"
          />

          <div class="flex justify-end gap-2 pt-2">
            <UButton color="neutral" variant="ghost" @click="formOpen = false">
              Annuler
            </UButton>
            <UButton type="submit" color="neutral" :loading="formPending">
              Créer
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
  type ReportCreateInput
} from '~/shared/utils/progress-reports'

definePageMeta({})

interface StudentRef {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface ProgressReportItem {
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
  student?: StudentRef
}

const toast = useToast()
const { user } = useUserSession()
const isTutor = computed<boolean>(() => user.value?.role === Role.Tutor)

const { data, status, error, refresh } = await useFetch<ProgressReportItem[]>(
  '/api/progress-reports',
  { default: () => [] }
)

const reports = computed<ProgressReportItem[]>(() => data.value ?? [])
const toReviewCount = computed<number>(
  () => reports.value.filter((r) => r.status === 'soumis').length
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

const formOpen = ref(false)
const formPending = ref(false)
const formError = ref<string | null>(null)
const formState = reactive<{
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

function openCreate() {
  formState.title = ''
  formState.periodStart = ''
  formState.periodEnd = ''
  formState.body = ''
  formState.difficulties = ''
  formState.learnings = ''
  formError.value = null
  formOpen.value = true
}

async function onCreateSubmit() {
  formPending.value = true
  formError.value = null
  const body: ReportCreateInput = {
    title: formState.title,
    periodStart: formState.periodStart,
    periodEnd: formState.periodEnd,
    body: formState.body,
    difficulties:
      formState.difficulties.trim() === '' ? null : formState.difficulties,
    learnings: formState.learnings.trim() === '' ? null : formState.learnings
  }
  try {
    await $fetch('/api/progress-reports', { method: 'POST', body })
    formOpen.value = false
    await refresh()
    toast.add({ title: 'Rapport créé', color: 'success' })
  } catch (err: unknown) {
    formError.value = readErrorMessage(err) ?? 'Impossible de créer le rapport.'
  } finally {
    formPending.value = false
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
