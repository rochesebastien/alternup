<template>
  <div class="max-w-5xl mx-auto px-4 py-8 space-y-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Mes alternants &amp; stagiaires</h1>
        <p class="text-sm text-gray-500">
          {{ learners.length }} {{ learners.length > 1 ? 'personnes rattachées' : 'personne rattachée' }}
        </p>
      </div>
      <UButton color="primary" icon="i-lucide-user-plus" @click="openAdd">
        Ajouter
      </UButton>
    </div>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      :title="error.statusMessage ?? 'Erreur de chargement'"
      :description="errorDetail(error)"
    />

    <UCard>
      <UTable
        :columns="columns"
        :data="learners"
        :loading="status === 'pending'"
        empty="Aucun alternant rattaché pour le moment."
      >
        <template #fullName-cell="{ row }">
          <NuxtLink
            :to="`/alternants/${row.original.id}`"
            class="font-medium text-gray-900 hover:text-primary-600"
          >
            {{ row.original.firstName }} {{ row.original.lastName }}
          </NuxtLink>
        </template>

        <template #role-cell="{ row }">
          <UBadge
            :color="row.original.role === 'Alternant' ? 'primary' : 'info'"
            variant="subtle"
          >
            {{ row.original.role }}
          </UBadge>
        </template>

        <template #addedAt-cell="{ row }">
          <span class="text-sm text-gray-500">{{ formatDate(row.original.addedAt) }}</span>
        </template>

        <template #actions-cell="{ row }">
          <UButton
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            size="sm"
            :aria-label="`Retirer ${row.original.firstName} ${row.original.lastName}`"
            @click="openRemove(row.original)"
          />
        </template>
      </UTable>
    </UCard>

    <UModal v-model:open="addOpen" title="Ajouter un alternant ou stagiaire">
      <template #body>
        <UForm
          :state="addState"
          :schema="addLearnerByEmailSchema"
          class="space-y-4"
          @submit="onAddSubmit"
        >
          <UFormField label="Email du learner" name="email" required>
            <UInput
              v-model="addState.email"
              type="email"
              placeholder="learner@exemple.com"
              autocomplete="email"
              class="w-full"
            />
          </UFormField>

          <p class="text-xs text-gray-500">
            Le compte doit déjà exister avec le rôle Alternant ou Stagiaire.
          </p>

          <UAlert
            v-if="addError"
            color="error"
            variant="soft"
            :title="addError"
          />

          <div class="flex justify-end gap-2 pt-2">
            <UButton color="neutral" variant="ghost" @click="addOpen = false">
              Annuler
            </UButton>
            <UButton type="submit" color="primary" :loading="addPending">
              Ajouter
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <UModal v-model:open="removeOpen" title="Retirer ce learner ?">
      <template #body>
        <p class="text-sm text-gray-600">
          Vous êtes sur le point de retirer
          <span class="font-semibold">
            {{ pendingRemove?.firstName }} {{ pendingRemove?.lastName }}
          </span>
          de votre réseau. Cette action n'affecte pas le compte de la personne.
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
            Retirer
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  middleware: ['role'],
  requireRole: 'Tutor'
})

interface Learner {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'Alternant' | 'Stagiaire'
  addedAt: string
}

const { user } = useUserSession()
const toast = useToast()

const tutorId = computed(() => user.value?.id)

const {
  data,
  status,
  error,
  refresh
} = await useFetch<Learner[]>(
  () => `/api/tutors/${tutorId.value}/learners`,
  { default: () => [], immediate: !!tutorId.value }
)

const learners = computed(() => data.value ?? [])

const columns: TableColumn<Learner>[] = [
  { accessorKey: 'fullName', header: 'Nom' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'role', header: 'Rôle' },
  { accessorKey: 'addedAt', header: 'Ajouté le' },
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

function errorDetail(err: { data?: { statusMessage?: string }; message?: string }): string | undefined {
  return err.data?.statusMessage || err.message
}

const addLearnerByEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email invalide")
})

type AddLearnerForm = z.input<typeof addLearnerByEmailSchema>

const addOpen = ref(false)
const addState = reactive<AddLearnerForm>({ email: '' })
const addPending = ref(false)
const addError = ref<string | null>(null)

function openAdd() {
  addState.email = ''
  addError.value = null
  addOpen.value = true
}

async function onAddSubmit() {
  if (!tutorId.value) return
  addPending.value = true
  addError.value = null
  try {
    await $fetch(`/api/tutors/${tutorId.value}/learners`, {
      method: 'POST',
      body: { email: addState.email }
    })
    addOpen.value = false
    await refresh()
    toast.add({
      title: 'Learner ajouté',
      description: `${addState.email} est désormais rattaché à votre réseau.`,
      color: 'success'
    })
  } catch (err: unknown) {
    addError.value = readErrorMessage(err) ?? 'Impossible d\'ajouter ce learner.'
  } finally {
    addPending.value = false
  }
}

const removeOpen = ref(false)
const pendingRemove = ref<Learner | null>(null)
const removePending = ref(false)
const removeError = ref<string | null>(null)

function openRemove(learner: Learner) {
  pendingRemove.value = learner
  removeError.value = null
  removeOpen.value = true
}

async function confirmRemove() {
  if (!tutorId.value || !pendingRemove.value) return
  removePending.value = true
  removeError.value = null
  const target = pendingRemove.value
  try {
    await $fetch(
      `/api/tutors/${tutorId.value}/learners/${target.id}`,
      { method: 'DELETE' }
    )
    removeOpen.value = false
    await refresh()
    toast.add({
      title: 'Learner retiré',
      description: `${target.firstName} ${target.lastName} a été retiré de votre réseau.`,
      color: 'success'
    })
  } catch (err: unknown) {
    removeError.value = readErrorMessage(err) ?? 'Impossible de retirer ce learner.'
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
