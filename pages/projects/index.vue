<template>
  <div class="max-w-5xl mx-auto px-4 py-8 space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-[var(--ui-text)]">Mes projets</h1>
        <p class="text-sm text-[var(--ui-text-muted)]">
          {{ projects.length }} projet{{ projects.length > 1 ? 's' : '' }}
        </p>
      </div>
      <UButton color="primary" icon="i-lucide-plus" @click="openCreate">
        Nouveau projet
      </UButton>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Erreur de chargement"
      :description="error.message"
    />

    <UCard>
      <UTable
        :columns="columns"
        :data="projects"
        :loading="status === 'pending'"
        empty="Aucun projet pour le moment. Créez-en un pour commencer."
      >
        <template #title-cell="{ row }">
          <NuxtLink
            :to="`/projects/${row.original.id}`"
            class="font-medium text-[var(--ui-text)] hover:text-[var(--ui-primary)]"
          >
            {{ row.original.title }}
          </NuxtLink>
        </template>

        <template #internal-cell="{ row }">
          <UBadge
            :color="row.original.internal ? 'primary' : 'neutral'"
            variant="subtle"
          >
            {{ row.original.internal ? 'Interne' : 'Externe' }}
          </UBadge>
        </template>

        <template #createdAt-cell="{ row }">
          <span class="text-sm text-[var(--ui-text-muted)]">{{ formatDate(row.original.createdAt) }}</span>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex justify-end gap-1">
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-lucide-pencil"
              size="sm"
              :aria-label="`Éditer ${row.original.title}`"
              @click="openEdit(row.original)"
            />
            <UButton
              variant="ghost"
              color="error"
              icon="i-lucide-trash-2"
              size="sm"
              :aria-label="`Supprimer ${row.original.title}`"
              @click="openRemove(row.original)"
            />
          </div>
        </template>
      </UTable>
    </UCard>

    <UModal
      v-model:open="formOpen"
      :title="editing ? 'Éditer le projet' : 'Nouveau projet'"
    >
      <template #body>
        <UForm
          :state="formState"
          :schema="projectCreateSchema"
          class="space-y-4"
          @submit="onFormSubmit"
        >
          <UFormField label="Titre" name="title" required>
            <UInput v-model="formState.title" class="w-full" />
          </UFormField>

          <UFormField label="Description" name="description">
            <UTextarea v-model="formState.description" :rows="4" class="w-full" />
          </UFormField>

          <UFormField name="internal">
            <UCheckbox v-model="formState.internal" label="Projet interne" />
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
            <UButton type="submit" color="primary" :loading="formPending">
              {{ editing ? 'Enregistrer' : 'Créer' }}
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <UModal v-model:open="removeOpen" title="Supprimer ce projet ?">
      <template #body>
        <p class="text-sm text-[var(--ui-text-muted)]">
          Le projet <span class="font-semibold">{{ pendingRemove?.title }}</span> et
          toutes ses missions associées seront supprimés. Cette action est
          irréversible.
        </p>

        <UAlert
          v-if="removeError"
          class="mt-4"
          color="error"
          variant="soft"
          :title="removeError"
        />

        <div class="flex justify-end gap-2 mt-6">
          <UButton color="neutral" variant="ghost" @click="removeOpen = false">
            Annuler
          </UButton>
          <UButton color="error" :loading="removePending" @click="confirmRemove">
            Supprimer
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import {
  projectCreateSchema,
  type ProjectCreateInput
} from '~/shared/utils/projects'

definePageMeta({
  middleware: ['role'],
  requireRole: 'Tutor'
})

interface ProjectListItem {
  id: string
  title: string
  description: string | null
  internal: boolean
  createdAt: string
  createdBy: { id: string; firstName: string; lastName: string; email: string } | null
}

const toast = useToast()

const {
  data,
  status,
  error,
  refresh
} = await useFetch<ProjectListItem[]>('/api/projects', { default: () => [] })

const projects = computed(() => data.value ?? [])

const columns: TableColumn<ProjectListItem>[] = [
  { accessorKey: 'title', header: 'Titre' },
  { accessorKey: 'internal', header: 'Type' },
  { accessorKey: 'createdAt', header: 'Créé le' },
  { accessorKey: 'actions', header: '' }
]

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value))
}

const formOpen = ref(false)
const editing = ref<ProjectListItem | null>(null)
const formState = reactive<{ title: string; description: string; internal: boolean }>({
  title: '',
  description: '',
  internal: true
})
const formPending = ref(false)
const formError = ref<string | null>(null)

function openCreate() {
  editing.value = null
  formState.title = ''
  formState.description = ''
  formState.internal = true
  formError.value = null
  formOpen.value = true
}

function openEdit(project: ProjectListItem) {
  editing.value = project
  formState.title = project.title
  formState.description = project.description ?? ''
  formState.internal = project.internal
  formError.value = null
  formOpen.value = true
}

async function onFormSubmit() {
  formPending.value = true
  formError.value = null
  const body: ProjectCreateInput = {
    title: formState.title,
    description: formState.description.trim() === '' ? null : formState.description,
    internal: formState.internal
  }
  try {
    if (editing.value) {
      await $fetch(`/api/projects/${editing.value.id}`, { method: 'PUT', body })
      toast.add({ title: 'Projet mis à jour', color: 'success' })
    } else {
      await $fetch('/api/projects', { method: 'POST', body })
      toast.add({ title: 'Projet créé', color: 'success' })
    }
    formOpen.value = false
    await refresh()
  } catch (err: unknown) {
    formError.value = readErrorMessage(err) ?? 'Impossible d\'enregistrer le projet.'
  } finally {
    formPending.value = false
  }
}

const removeOpen = ref(false)
const pendingRemove = ref<ProjectListItem | null>(null)
const removePending = ref(false)
const removeError = ref<string | null>(null)

function openRemove(project: ProjectListItem) {
  pendingRemove.value = project
  removeError.value = null
  removeOpen.value = true
}

async function confirmRemove() {
  if (!pendingRemove.value) return
  removePending.value = true
  removeError.value = null
  try {
    await $fetch(`/api/projects/${pendingRemove.value.id}`, { method: 'DELETE' })
    removeOpen.value = false
    await refresh()
    toast.add({ title: 'Projet supprimé', color: 'success' })
  } catch (err: unknown) {
    removeError.value = readErrorMessage(err) ?? 'Impossible de supprimer ce projet.'
  } finally {
    removePending.value = false
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
