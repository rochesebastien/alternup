<template>
  <div class="w-full px-6 py-10 space-y-6">
    <PageHeader
      title="Mes missions"
      :subtitle="`${missions.length} mission${missions.length > 1 ? 's' : ''} en cours ou passées`"
    />

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Erreur de chargement"
      :description="error.message"
    />

    <div v-if="status === 'pending'" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="animate-spin h-6 w-6 text-[var(--ui-text-dimmed)]" />
    </div>

    <div
      v-else-if="missions.length === 0"
      class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
    >
      Aucune mission ne vous est encore attribuée.
    </div>

    <div
      v-for="mission in missions"
      v-else
      :key="mission.id"
      class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5 space-y-5"
    >
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 class="text-base font-semibold text-[var(--ui-text)]">{{ mission.project.title }}</h2>
          <p class="text-xs text-[var(--ui-text-muted)] mt-0.5">
            {{ mission.project.internal ? 'Projet interne' : 'Projet externe' }}
          </p>
        </div>
        <UBadge
          :color="projectStatusColor(mission.status)"
          variant="subtle"
          class="font-normal"
        >
          {{ projectStatusLabel(mission.status) }}
        </UBadge>
      </div>

      <div v-if="mission.tutorComment" class="rounded-md bg-[var(--ui-bg-muted)] p-3">
        <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide mb-1">Commentaire tuteur</p>
        <p class="text-sm text-[var(--ui-text-toned)] whitespace-pre-line">
          {{ mission.tutorComment }}
        </p>
      </div>

      <!-- Publier un nouveau retour -->
      <UForm
        :state="formStateFor(mission)"
        :schema="updateFormSchema"
        class="space-y-3"
        @submit="onSubmit(mission)"
      >
        <UFormField label="Avancement" name="status">
          <USelect
            v-model="formStateFor(mission).status"
            :items="statusItems"
            value-key="value"
            class="w-full sm:w-64"
          />
        </UFormField>

        <UFormField label="Nouveau retour" name="body">
          <UTextarea
            v-model="formStateFor(mission).body"
            :rows="3"
            class="w-full"
            placeholder="Où en êtes-vous ? Ce que vous avez fait, ce qui bloque, la suite…"
          />
        </UFormField>

        <UAlert
          v-if="errors[mission.id]"
          color="error"
          variant="soft"
          :title="errors[mission.id] ?? ''"
        />

        <div class="flex justify-end">
          <UButton type="submit" color="neutral" icon="i-lucide-send" :loading="pending[mission.id]">
            Publier le retour
          </UButton>
        </div>
      </UForm>

      <!-- Journal des retours -->
      <div v-if="mission.updates.length" class="pt-1">
        <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide mb-3">
          Journal ({{ mission.updates.length }})
        </p>
        <UpdateTimeline :items="mission.updates" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ProjectStatus, Role } from '~/shared/utils/enums'
import {
  PROJECT_STATUS_OPTIONS,
  projectStatusColor,
  projectStatusLabel
} from '~/shared/utils/projects'
import { projectUpdateCreateSchema } from '~/shared/utils/project-updates'

definePageMeta({
  middleware: ['role'],
  requireRole: [Role.Alternant, Role.Stagiaire]
})

interface MissionUpdate {
  id: string
  body: string
  status: ProjectStatus | null
  createdAt: string
  author: { id: string; firstName: string; lastName: string; role: Role }
}

interface Mission {
  id: string
  projectId: string
  studentId: string
  status: ProjectStatus
  tutorComment: string | null
  studentComment: string | null
  startedAt: string | null
  updatedAt: string
  project: { id: string; title: string; internal: boolean; createdById: string | null }
  updates: MissionUpdate[]
}

const toast = useToast()

const {
  data,
  status,
  error,
  refresh
} = await useFetch<Mission[]>('/api/project-assignments', { default: () => [] })

const missions = computed(() => data.value ?? [])

const statusItems = PROJECT_STATUS_OPTIONS
const updateFormSchema = projectUpdateCreateSchema

interface UpdateFormState {
  status: ProjectStatus
  body: string
}

const states = reactive<Record<string, UpdateFormState>>({})
const pending = reactive<Record<string, boolean>>({})
const errors = reactive<Record<string, string | null>>({})

function formStateFor(mission: Mission): UpdateFormState {
  let current = states[mission.id]
  if (!current) {
    current = { status: mission.status, body: '' }
    states[mission.id] = current
  }
  return current
}

async function onSubmit(mission: Mission) {
  const state = formStateFor(mission)
  pending[mission.id] = true
  errors[mission.id] = null
  try {
    await $fetch(`/api/project-assignments/${mission.id}/updates`, {
      method: 'POST',
      body: { body: state.body, status: state.status }
    })
    state.body = ''
    toast.add({ title: 'Retour publié', color: 'success' })
    await refresh()
  } catch (err: unknown) {
    errors[mission.id] = readErrorMessage(err) ?? 'Impossible de publier le retour.'
  } finally {
    pending[mission.id] = false
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
