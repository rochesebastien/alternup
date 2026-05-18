<template>
  <div class="max-w-4xl mx-auto px-4 py-8 space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Mes missions</h1>
      <p class="text-sm text-gray-500">
        {{ missions.length }} mission{{ missions.length > 1 ? 's' : '' }} en cours ou passées.
      </p>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Erreur de chargement"
      :description="error.message"
    />

    <div v-if="status === 'pending'" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8 text-primary-500" />
    </div>

    <UCard v-else-if="missions.length === 0">
      <p class="text-gray-500 text-center py-6">
        Aucune mission ne vous est encore attribuée.
      </p>
    </UCard>

    <UCard v-for="mission in missions" v-else :key="mission.id">
      <template #header>
        <div class="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">{{ mission.project.title }}</h2>
            <UBadge
              class="mt-1"
              :color="mission.project.internal ? 'primary' : 'neutral'"
              variant="subtle"
            >
              {{ mission.project.internal ? 'Interne' : 'Externe' }}
            </UBadge>
          </div>
          <UBadge
            :color="projectStatusColor(mission.status)"
            variant="solid"
            size="lg"
          >
            {{ projectStatusLabel(mission.status) }}
          </UBadge>
        </div>
      </template>

      <div v-if="mission.tutorComment" class="mb-4 bg-gray-50 rounded-md p-3">
        <p class="text-xs text-gray-500 uppercase tracking-wide">Commentaire tuteur</p>
        <p class="text-sm text-gray-700 whitespace-pre-line">
          {{ mission.tutorComment }}
        </p>
      </div>

      <UForm
        :state="formStateFor(mission)"
        :schema="missionUpdateSchema"
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

        <UFormField label="Mes notes" name="studentComment">
          <UTextarea
            v-model="formStateFor(mission).studentComment"
            :rows="3"
            class="w-full"
            placeholder="Notez ce que vous avez fait, ce que vous comptez faire…"
          />
        </UFormField>

        <UAlert
          v-if="errors[mission.id]"
          color="error"
          variant="soft"
          :title="errors[mission.id] ?? ''"
        />

        <div class="flex justify-end">
          <UButton type="submit" color="primary" :loading="pending[mission.id]">
            Mettre à jour
          </UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { ProjectStatus, Role } from '@prisma/client'
import {
  PROJECT_STATUS_OPTIONS,
  projectStatusColor,
  projectStatusLabel
} from '~/shared/utils/projects'

definePageMeta({
  middleware: ['role'],
  requireRole: [Role.Alternant, Role.Stagiaire]
})

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

const missionUpdateSchema = z.object({
  status: z.nativeEnum(ProjectStatus),
  studentComment: z.string().trim().max(5000).nullable().optional()
})

interface MissionFormState {
  status: ProjectStatus
  studentComment: string
}

const states = reactive<Record<string, MissionFormState>>({})
const pending = reactive<Record<string, boolean>>({})
const errors = reactive<Record<string, string | null>>({})

function formStateFor(mission: Mission): MissionFormState {
  let current = states[mission.id]
  if (!current) {
    current = {
      status: mission.status,
      studentComment: mission.studentComment ?? ''
    }
    states[mission.id] = current
  }
  return current
}

async function onSubmit(mission: Mission) {
  const state = formStateFor(mission)
  pending[mission.id] = true
  errors[mission.id] = null
  try {
    await $fetch(`/api/project-assignments/${mission.id}`, {
      method: 'PUT',
      body: {
        status: state.status,
        studentComment:
          state.studentComment.trim() === '' ? null : state.studentComment
      }
    })
    toast.add({ title: 'Mission mise à jour', color: 'success' })
    await refresh()
  } catch (err: unknown) {
    errors[mission.id] = readErrorMessage(err) ?? 'Impossible d\'enregistrer.'
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
