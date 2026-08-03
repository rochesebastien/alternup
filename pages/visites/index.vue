<script setup lang="ts">
import { Role } from '~/shared/utils/enums'
import type { VisitStatus } from '~/shared/utils/enums'
import {
  visitCreateSchema,
  visitModeLabel,
  VISIT_MODE_OPTIONS,
  VISIT_STATUS_OPTIONS
} from '~/shared/utils/tutor-visits'

definePageMeta({})

const { user } = useUserSession()
const isTutor = computed<boolean>(() => user.value?.role === Role.Tutor)

// --- Types ------------------------------------------------------------------
interface Person {
  id: string
  firstName: string
  lastName: string
}

interface TutorVisit {
  id: string
  tutorId: string
  studentId: string
  scheduledAt: string
  mode: string | null
  location: string | null
  status: string
  summary: string | null
  nextSteps: string | null
  student?: Person
  tutor?: Person
}

// --- Chargement -------------------------------------------------------------
const { data: visits, refresh } = await useFetch<TutorVisit[]>(
  '/api/tutor-visits',
  { default: () => [] }
)

// --- Tuteur : alternants pour la planification ------------------------------
interface Learner {
  id: string
  firstName: string
  lastName: string
}

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

// --- Formatage des dates ----------------------------------------------------
const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' })
const timeFmt = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit'
})

function formatDate(value: string): string {
  return dateFmt.format(new Date(value))
}

function formatTime(value: string): string {
  return timeFmt.format(new Date(value))
}

// --- Tuteur : création -------------------------------------------------------
const createOpen = ref<boolean>(false)
const createPending = ref<boolean>(false)
const createError = ref<string | null>(null)

const createState = reactive<{
  studentId: string
  scheduledAt: string
  mode: string
  location: string
}>({
  studentId: '',
  scheduledAt: '',
  mode: '',
  location: ''
})

function resetCreate(): void {
  createState.studentId = ''
  createState.scheduledAt = ''
  createState.mode = ''
  createState.location = ''
  createError.value = null
}

function openCreate(): void {
  resetCreate()
  createOpen.value = true
}

async function onCreateSubmit(): Promise<void> {
  createPending.value = true
  createError.value = null
  try {
    await $fetch('/api/tutor-visits', {
      method: 'POST',
      body: {
        studentId: createState.studentId,
        scheduledAt: createState.scheduledAt,
        mode: createState.mode || null,
        location: createState.location || null
      }
    })
    createOpen.value = false
    resetCreate()
    await refresh()
  } catch (err: unknown) {
    createError.value
      = (err as { data?: { message?: string } })?.data?.message
        ?? 'Impossible de planifier la visite.'
  } finally {
    createPending.value = false
  }
}

// --- Tuteur : compte-rendu (édition) ----------------------------------------
const editOpen = ref<boolean>(false)
const editPending = ref<boolean>(false)
const editError = ref<string | null>(null)
const editId = ref<string | null>(null)

const editState = reactive<{
  status: VisitStatus
  summary: string
  nextSteps: string
}>({
  status: 'planifiee',
  summary: '',
  nextSteps: ''
})

function openEdit(visit: TutorVisit): void {
  editId.value = visit.id
  editState.status = visit.status as VisitStatus
  editState.summary = visit.summary ?? ''
  editState.nextSteps = visit.nextSteps ?? ''
  editError.value = null
  editOpen.value = true
}

async function onEditSubmit(): Promise<void> {
  if (!editId.value) return
  editPending.value = true
  editError.value = null
  try {
    await $fetch(`/api/tutor-visits/${editId.value}`, {
      method: 'PUT',
      body: {
        status: editState.status,
        summary: editState.summary || null,
        nextSteps: editState.nextSteps || null
      }
    })
    editOpen.value = false
    editId.value = null
    await refresh()
  } catch (err: unknown) {
    editError.value
      = (err as { data?: { message?: string } })?.data?.message
        ?? 'Impossible d\'enregistrer le compte-rendu.'
  } finally {
    editPending.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-6 py-10 space-y-6">
    <!-- Tuteur -------------------------------------------------------------->
    <template v-if="isTutor">
      <PageHeader
        title="Visites"
        subtitle="Planifiez et documentez vos visites."
      >
        <template #actions>
          <UButton color="neutral" icon="i-lucide-plus" @click="openCreate">
            Planifier une visite
          </UButton>
        </template>
      </PageHeader>

      <div
        v-if="(visits ?? []).length === 0"
        class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
      >
        Aucune visite planifiée pour le moment.
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="visit in visits"
          :key="visit.id"
          class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5 space-y-3"
        >
          <div class="flex items-start justify-between gap-4 flex-wrap">
            <div class="min-w-0 space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-base font-semibold">
                  {{ visit.student?.firstName }} {{ visit.student?.lastName }}
                </span>
                <VisitStatusBadge :status="visit.status" />
              </div>
              <p class="text-sm text-[var(--ui-text-muted)]">
                {{ formatDate(visit.scheduledAt) }} · {{ formatTime(visit.scheduledAt) }}
              </p>
              <p class="text-sm text-[var(--ui-text-dimmed)]">
                {{ visitModeLabel(visit.mode) }}
                <template v-if="visit.location"> · {{ visit.location }}</template>
              </p>
            </div>
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-file-text"
              @click="openEdit(visit)"
            >
              Compte-rendu
            </UButton>
          </div>

          <div
            v-if="visit.summary"
            class="rounded-lg bg-[var(--ui-bg-muted)] p-4 space-y-3"
          >
            <div class="space-y-1">
              <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
                Compte-rendu
              </p>
              <p class="text-sm text-[var(--ui-text)] whitespace-pre-line">
                {{ visit.summary }}
              </p>
            </div>
            <div v-if="visit.nextSteps" class="space-y-1">
              <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
                Prochaines étapes
              </p>
              <p class="text-sm text-[var(--ui-text)] whitespace-pre-line">
                {{ visit.nextSteps }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal de création -->
      <UModal v-model:open="createOpen" title="Planifier une visite">
        <template #body>
          <UForm
            :state="createState"
            :schema="visitCreateSchema"
            class="space-y-4"
            @submit="onCreateSubmit"
          >
            <UFormField label="Alternant" name="studentId" required>
              <USelectMenu
                v-model="createState.studentId"
                value-key="value"
                :items="learnerItems"
                placeholder="Sélectionner un alternant…"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Date et heure" name="scheduledAt" required>
              <UInput
                v-model="createState.scheduledAt"
                type="datetime-local"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Mode" name="mode">
              <USelect
                v-model="createState.mode"
                :items="VISIT_MODE_OPTIONS"
                placeholder="Sélectionner un mode…"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Lieu" name="location">
              <UInput v-model="createState.location" class="w-full" />
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
                Planifier
              </UButton>
            </div>
          </UForm>
        </template>
      </UModal>

      <!-- Modal d'édition (compte-rendu) -->
      <UModal v-model:open="editOpen" title="Compte-rendu de visite">
        <template #body>
          <UForm
            :state="editState"
            class="space-y-4"
            @submit="onEditSubmit"
          >
            <UFormField label="Statut" name="status">
              <USelect
                v-model="editState.status"
                :items="VISIT_STATUS_OPTIONS"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Compte-rendu" name="summary">
              <UTextarea
                v-model="editState.summary"
                :rows="5"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Prochaines étapes" name="nextSteps">
              <UTextarea
                v-model="editState.nextSteps"
                :rows="4"
                class="w-full"
              />
            </UFormField>

            <UAlert
              v-if="editError"
              color="error"
              variant="soft"
              :title="editError"
            />

            <div class="flex justify-end gap-2 pt-2">
              <UButton
                color="neutral"
                variant="ghost"
                @click="editOpen = false"
              >
                Annuler
              </UButton>
              <UButton type="submit" color="neutral" :loading="editPending">
                Enregistrer
              </UButton>
            </div>
          </UForm>
        </template>
      </UModal>
    </template>

    <!-- Learner ------------------------------------------------------------->
    <template v-else>
      <PageHeader title="Mes visites" />

      <div
        v-if="(visits ?? []).length === 0"
        class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
      >
        Aucune visite planifiée pour le moment.
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="visit in visits"
          :key="visit.id"
          class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5 space-y-3"
        >
          <div class="space-y-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-base font-semibold">
                {{ visit.tutor?.firstName }} {{ visit.tutor?.lastName }}
              </span>
              <VisitStatusBadge :status="visit.status" />
            </div>
            <p class="text-sm text-[var(--ui-text-muted)]">
              {{ formatDate(visit.scheduledAt) }} · {{ formatTime(visit.scheduledAt) }}
            </p>
            <p class="text-sm text-[var(--ui-text-dimmed)]">
              {{ visitModeLabel(visit.mode) }}
              <template v-if="visit.location"> · {{ visit.location }}</template>
            </p>
          </div>

          <div
            v-if="visit.summary"
            class="rounded-lg bg-[var(--ui-bg-muted)] p-4 space-y-3"
          >
            <div class="space-y-1">
              <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
                Compte-rendu
              </p>
              <p class="text-sm text-[var(--ui-text)] whitespace-pre-line">
                {{ visit.summary }}
              </p>
            </div>
            <div v-if="visit.nextSteps" class="space-y-1">
              <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
                Prochaines étapes
              </p>
              <p class="text-sm text-[var(--ui-text)] whitespace-pre-line">
                {{ visit.nextSteps }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
