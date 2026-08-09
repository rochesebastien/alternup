<template>
  <div class="w-full px-6 py-10 space-y-6">
    <UButton variant="link" color="neutral" icon="i-lucide-arrow-left" to="/projects" class="-ml-2 px-2 text-[var(--ui-text-muted)]">
      Retour aux projets
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

    <template v-else-if="project">
      <PageHeader :title="project.title">
        <template #actions>
          <UBadge color="neutral" variant="subtle" class="font-normal">
            {{ project.internal ? 'Interne' : 'Externe' }}
          </UBadge>
        </template>
      </PageHeader>

      <p v-if="project.description" class="text-[var(--ui-text-toned)] whitespace-pre-line -mt-1">
        {{ project.description }}
      </p>
      <p v-else class="text-[var(--ui-text-dimmed)] -mt-1">Aucune description.</p>

      <div class="pt-2">
        <div class="flex items-end justify-between gap-4 mb-4">
          <div>
            <h2 class="text-base font-semibold text-[var(--ui-text)]">Missions</h2>
            <p class="text-sm text-[var(--ui-text-muted)] mt-0.5">
              {{ project.assignments.length }} mission{{ project.assignments.length > 1 ? 's' : '' }}
            </p>
          </div>
          <UButton color="neutral" icon="i-lucide-plus" @click="openAssign">
            Assigner un alternant
          </UButton>
        </div>

        <div
          v-if="project.assignments.length === 0"
          class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-10 text-center"
        >
          Aucune mission n'est encore attribuée pour ce projet.
        </div>

        <ul v-else class="space-y-3">
          <li
            v-for="assignment in project.assignments"
            :key="assignment.id"
            class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-4 flex flex-col gap-3"
          >
            <div class="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p class="font-medium text-[var(--ui-text)]">
                  {{ assignment.student.firstName }} {{ assignment.student.lastName }}
                </p>
                <p class="text-sm text-[var(--ui-text-muted)]">{{ assignment.student.email }}</p>
              </div>
              <div class="flex items-center gap-1">
                <UBadge
                  :color="projectStatusColor(assignment.status)"
                  variant="subtle"
                  class="mr-1 font-normal"
                >
                  {{ projectStatusLabel(assignment.status) }}
                </UBadge>
                <UTooltip text="Modifier la mission">
                  <UButton
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-pencil"
                    size="sm"
                    :aria-label="`Éditer la mission de ${assignment.student.firstName}`"
                    @click="openEditAssignment(assignment)"
                  />
                </UTooltip>
                <UTooltip text="Retirer la mission">
                  <UButton
                    variant="ghost"
                    color="neutral"
                    icon="i-lucide-trash-2"
                    size="sm"
                    :aria-label="`Retirer ${assignment.student.firstName}`"
                    @click="openRemoveAssignment(assignment)"
                  />
                </UTooltip>
              </div>
            </div>

            <div v-if="assignment.tutorComment" class="rounded-md bg-[var(--ui-bg-muted)] p-3">
              <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide mb-1">Commentaire tuteur</p>
              <p class="text-sm text-[var(--ui-text-toned)] whitespace-pre-line">
                {{ assignment.tutorComment }}
              </p>
            </div>

            <div v-if="assignment.updates.length" class="rounded-md bg-[var(--ui-bg-muted)] p-3">
              <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide mb-3">
                Journal des retours ({{ assignment.updates.length }})
              </p>
              <UpdateTimeline :items="assignment.updates" />
            </div>
          </li>
        </ul>
      </div>
    </template>

    <!-- Assigner -->
    <UModal v-model:open="assignOpen" title="Assigner un alternant">
      <template #body>
        <UForm
          :state="assignState"
          :schema="assignSchema"
          class="space-y-4"
          @submit="onAssignSubmit"
        >
          <UFormField label="Alternant ou stagiaire" name="studentId" required>
            <USelect
              v-model="assignState.studentId"
              :items="learnerItems"
              value-key="value"
              placeholder="Sélectionner un alternant…"
              class="w-full"
            />
            <template #help>
              <span v-if="learnerItems.length === 0" class="text-xs text-amber-600">
                Aucun alternant dans votre réseau.
                <NuxtLink to="/alternants" class="underline">Ajouter d'abord un alternant</NuxtLink>.
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
            <UButton type="submit" color="neutral" :loading="assignPending">
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
            <UButton type="submit" color="neutral" :loading="editAssignPending">
              Enregistrer
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Retirer mission -->
    <UModal v-model:open="removeAssignOpen" title="Retirer cette mission ?">
      <template #body>
        <p class="text-sm text-[var(--ui-text-muted)]">
          La mission sera retirée. Le compte de l'alternant n'est pas affecté.
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
import { ProjectStatus } from '~/shared/utils/enums'
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

interface AssignmentUpdate {
  id: string
  body: string
  status: ProjectStatus | null
  createdAt: string
  author: { id: string; firstName: string; lastName: string; role: string }
}

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
  updates: AssignmentUpdate[]
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
// Forwarde les cookies de session lors du rendu serveur (sinon 401 sur les $fetch SSR)
const requestFetch = useRequestFetch()

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
    learners.value = await requestFetch<LearnerRef[]>(`/api/tutors/${id}/learners`)
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
    assignError.value = readErrorMessage(err) ?? 'Impossible d\'assigner cet alternant.'
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
