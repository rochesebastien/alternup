<template>
  <div class="max-w-4xl mx-auto px-4 py-8 space-y-6">
    <UButton variant="ghost" color="neutral" icon="i-lucide-arrow-left" to="/projects">
      Retour aux projets
    </UButton>

    <div v-if="status === 'pending'" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8 text-primary-500" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      title="Erreur"
      :description="error.message"
    />

    <template v-else-if="project">
      <UCard>
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">{{ project.title }}</h1>
              <UBadge
                class="mt-1"
                :color="project.internal ? 'primary' : 'neutral'"
                variant="subtle"
              >
                {{ project.internal ? 'Interne' : 'Externe' }}
              </UBadge>
            </div>
          </div>
        </template>

        <p v-if="project.description" class="text-gray-700 whitespace-pre-line">
          {{ project.description }}
        </p>
        <p v-else class="text-gray-400 italic">Aucune description.</p>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">Missions</h2>
              <p class="text-sm text-gray-500">
                {{ project.assignments.length }} mission{{ project.assignments.length > 1 ? 's' : '' }}
              </p>
            </div>
            <UButton color="primary" icon="i-lucide-user-plus" @click="openAssign">
              Assigner un learner
            </UButton>
          </div>
        </template>

        <div v-if="project.assignments.length === 0" class="text-gray-500 text-sm py-4 text-center">
          Aucune mission n'est encore attribuée pour ce projet.
        </div>

        <ul v-else class="divide-y divide-gray-200">
          <li
            v-for="assignment in project.assignments"
            :key="assignment.id"
            class="py-4 flex flex-col gap-3"
          >
            <div class="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p class="font-medium text-gray-900">
                  {{ assignment.student.firstName }} {{ assignment.student.lastName }}
                </p>
                <p class="text-sm text-gray-500">{{ assignment.student.email }}</p>
              </div>
              <div class="flex items-center gap-2">
                <UBadge
                  :color="projectStatusColor(assignment.status)"
                  variant="subtle"
                >
                  {{ projectStatusLabel(assignment.status) }}
                </UBadge>
                <UButton
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-pencil"
                  size="sm"
                  :aria-label="`Éditer la mission de ${assignment.student.firstName}`"
                  @click="openEditAssignment(assignment)"
                />
                <UButton
                  variant="ghost"
                  color="error"
                  icon="i-lucide-trash-2"
                  size="sm"
                  :aria-label="`Retirer ${assignment.student.firstName}`"
                  @click="openRemoveAssignment(assignment)"
                />
              </div>
            </div>

            <div v-if="assignment.tutorComment" class="bg-gray-50 rounded-md p-3">
              <p class="text-xs text-gray-500 uppercase tracking-wide">Commentaire tuteur</p>
              <p class="text-sm text-gray-700 whitespace-pre-line">
                {{ assignment.tutorComment }}
              </p>
            </div>

            <div v-if="assignment.studentComment" class="bg-primary-50 rounded-md p-3">
              <p class="text-xs text-primary-700 uppercase tracking-wide">Note du learner</p>
              <p class="text-sm text-gray-700 whitespace-pre-line">
                {{ assignment.studentComment }}
              </p>
            </div>
          </li>
        </ul>
      </UCard>
    </template>

    <!-- Assigner -->
    <UModal v-model:open="assignOpen" title="Assigner un learner">
      <template #body>
        <UForm
          :state="assignState"
          :schema="assignSchema"
          class="space-y-4"
          @submit="onAssignSubmit"
        >
          <UFormField label="Learner" name="studentId" required>
            <USelect
              v-model="assignState.studentId"
              :items="learnerItems"
              value-key="value"
              placeholder="Sélectionner un learner…"
              class="w-full"
            />
            <template #help>
              <span v-if="learnerItems.length === 0" class="text-xs text-amber-600">
                Aucun learner dans votre réseau.
                <NuxtLink to="/alternants" class="underline">Ajouter d'abord un learner</NuxtLink>.
              </span>
            </template>
          </UFormField>

          <UFormField label="Statut initial" name="status">
            <USelect
              v-model="assignState.status"
              :items="statusItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Commentaire tuteur (optionnel)" name="tutorComment">
            <UTextarea v-model="assignState.tutorComment" :rows="3" class="w-full" />
          </UFormField>

          <UAlert
            v-if="assignError"
            color="error"
            variant="soft"
            :title="assignError"
          />

          <div class="flex justify-end gap-2 pt-2">
            <UButton color="neutral" variant="ghost" @click="assignOpen = false">
              Annuler
            </UButton>
            <UButton type="submit" color="primary" :loading="assignPending">
              Assigner
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Éditer mission -->
    <UModal v-model:open="editAssignOpen" title="Mettre à jour la mission">
      <template #body>
        <UForm
          :state="editAssignState"
          :schema="assignmentUpdateSchema"
          class="space-y-4"
          @submit="onEditAssignmentSubmit"
        >
          <UFormField label="Statut" name="status">
            <USelect
              v-model="editAssignState.status"
              :items="statusItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Commentaire tuteur" name="tutorComment">
            <UTextarea v-model="editAssignState.tutorComment" :rows="3" class="w-full" />
          </UFormField>

          <UAlert
            v-if="editAssignError"
            color="error"
            variant="soft"
            :title="editAssignError"
          />

          <div class="flex justify-end gap-2 pt-2">
            <UButton color="neutral" variant="ghost" @click="editAssignOpen = false">
              Annuler
            </UButton>
            <UButton type="submit" color="primary" :loading="editAssignPending">
              Enregistrer
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Retirer mission -->
    <UModal v-model:open="removeAssignOpen" title="Retirer cette mission ?">
      <template #body>
        <p class="text-sm text-gray-600">
          La mission sera retirée. Le compte du learner n'est pas affecté.
        </p>
        <UAlert
          v-if="removeAssignError"
          class="mt-4"
          color="error"
          variant="soft"
          :title="removeAssignError"
        />
        <div class="flex justify-end gap-2 mt-6">
          <UButton color="neutral" variant="ghost" @click="removeAssignOpen = false">
            Annuler
          </UButton>
          <UButton color="error" :loading="removeAssignPending" @click="confirmRemoveAssignment">
            Retirer
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { ProjectStatus } from '@prisma/client'
import {
  PROJECT_STATUS_OPTIONS,
  assignmentUpdateSchema,
  projectStatusColor,
  projectStatusLabel
} from '~/shared/utils/projects'

definePageMeta({
  middleware: ['role'],
  requireRole: 'Tutor'
})

interface AssignmentWithStudent {
  id: string
  projectId: string
  studentId: string
  status: ProjectStatus
  tutorComment: string | null
  studentComment: string | null
  startedAt: string | null
  updatedAt: string
  student: { id: string; firstName: string; lastName: string; email: string }
}

interface ProjectDetail {
  id: string
  title: string
  description: string | null
  internal: boolean
  createdAt: string
  createdBy: { id: string; firstName: string; lastName: string; email: string } | null
  assignments: AssignmentWithStudent[]
}

const route = useRoute()
const toast = useToast()
const { user } = useUserSession()

const {
  data: project,
  status,
  error,
  refresh
} = await useFetch<ProjectDetail>(() => `/api/projects/${route.params.id}`)

interface LearnerRef {
  id: string
  firstName: string
  lastName: string
  email: string
}

const learners = ref<LearnerRef[]>([])
watch(
  () => user.value?.id,
  async (id) => {
    if (!id) return
    learners.value = await $fetch<LearnerRef[]>(`/api/tutors/${id}/learners`)
  },
  { immediate: true }
)

const learnerItems = computed(() =>
  learners.value.map((l) => ({
    label: `${l.firstName} ${l.lastName} (${l.email})`,
    value: l.id
  }))
)

const statusItems = PROJECT_STATUS_OPTIONS

const assignSchema = z.object({
  studentId: z.string().uuid('Sélection requise'),
  status: z.nativeEnum(ProjectStatus),
  tutorComment: z.string().trim().max(5000).optional()
})

const assignOpen = ref(false)
const assignState = reactive<{
  studentId: string
  status: ProjectStatus
  tutorComment: string
}>({
  studentId: '',
  status: ProjectStatus.non_demarre,
  tutorComment: ''
})
const assignPending = ref(false)
const assignError = ref<string | null>(null)

function openAssign() {
  assignState.studentId = ''
  assignState.status = ProjectStatus.non_demarre
  assignState.tutorComment = ''
  assignError.value = null
  assignOpen.value = true
}

async function onAssignSubmit() {
  if (!project.value) return
  assignPending.value = true
  assignError.value = null
  try {
    await $fetch('/api/project-assignments', {
      method: 'POST',
      body: {
        projectId: project.value.id,
        studentId: assignState.studentId,
        status: assignState.status,
        tutorComment: assignState.tutorComment.trim() === '' ? null : assignState.tutorComment
      }
    })
    assignOpen.value = false
    await refresh()
    toast.add({ title: 'Mission assignée', color: 'success' })
  } catch (err: unknown) {
    assignError.value = readErrorMessage(err) ?? 'Impossible d\'assigner ce learner.'
  } finally {
    assignPending.value = false
  }
}

const editAssignOpen = ref(false)
const editingAssignment = ref<AssignmentWithStudent | null>(null)
const editAssignState = reactive<{
  status: ProjectStatus
  tutorComment: string
}>({
  status: ProjectStatus.non_demarre,
  tutorComment: ''
})
const editAssignPending = ref(false)
const editAssignError = ref<string | null>(null)

function openEditAssignment(assignment: AssignmentWithStudent) {
  editingAssignment.value = assignment
  editAssignState.status = assignment.status
  editAssignState.tutorComment = assignment.tutorComment ?? ''
  editAssignError.value = null
  editAssignOpen.value = true
}

async function onEditAssignmentSubmit() {
  if (!editingAssignment.value) return
  editAssignPending.value = true
  editAssignError.value = null
  try {
    await $fetch(`/api/project-assignments/${editingAssignment.value.id}`, {
      method: 'PUT',
      body: {
        status: editAssignState.status,
        tutorComment:
          editAssignState.tutorComment.trim() === '' ? null : editAssignState.tutorComment
      }
    })
    editAssignOpen.value = false
    await refresh()
    toast.add({ title: 'Mission mise à jour', color: 'success' })
  } catch (err: unknown) {
    editAssignError.value =
      readErrorMessage(err) ?? 'Impossible de mettre à jour cette mission.'
  } finally {
    editAssignPending.value = false
  }
}

const removeAssignOpen = ref(false)
const pendingRemoveAssignment = ref<AssignmentWithStudent | null>(null)
const removeAssignPending = ref(false)
const removeAssignError = ref<string | null>(null)

function openRemoveAssignment(assignment: AssignmentWithStudent) {
  pendingRemoveAssignment.value = assignment
  removeAssignError.value = null
  removeAssignOpen.value = true
}

async function confirmRemoveAssignment() {
  if (!pendingRemoveAssignment.value) return
  removeAssignPending.value = true
  removeAssignError.value = null
  try {
    await $fetch(`/api/project-assignments/${pendingRemoveAssignment.value.id}`, {
      method: 'DELETE'
    })
    removeAssignOpen.value = false
    await refresh()
    toast.add({ title: 'Mission retirée', color: 'success' })
  } catch (err: unknown) {
    removeAssignError.value =
      readErrorMessage(err) ?? 'Impossible de retirer cette mission.'
  } finally {
    removeAssignPending.value = false
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
