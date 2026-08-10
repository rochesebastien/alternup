<template>
  <div class="w-full px-6 py-10 space-y-6">
    <PageHeader
      title="Alternants & stagiaires"
      :subtitle="`${learners.length} ${learners.length > 1 ? 'personnes rattachées' : 'personne rattachée'}`"
    >
      <template #actions>
        <UButton color="neutral" icon="i-lucide-plus" @click="openAdd">
          Ajouter
        </UButton>
      </template>
    </PageHeader>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      :title="error.statusMessage ?? 'Erreur de chargement'"
      :description="errorDetail(error)"
    />

    <div class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] overflow-hidden">
      <!-- `tbody` : survol de ligne (corps uniquement, pas l'en-tête) pour
           relier visuellement une personne à ses actions de fin de ligne. -->
      <UTable
        :columns="columns"
        :data="learners"
        :loading="status === 'pending'"
        empty="Aucun alternant rattaché pour le moment."
        :ui="{ tbody: '[&>tr]:transition-colors [&>tr]:hover:bg-[var(--ui-bg-muted)]' }"
      >
        <template #fullName-cell="{ row }">
          <NuxtLink
            :to="`/alternants/${row.original.id}`"
            class="font-medium text-[var(--ui-text)] hover:underline underline-offset-4"
          >
            {{ row.original.firstName }} {{ row.original.lastName }}
          </NuxtLink>
        </template>

        <template #role-cell="{ row }">
          <UBadge color="neutral" variant="subtle" class="font-normal">
            {{ row.original.role }}
          </UBadge>
        </template>

        <template #risk-cell="{ row }">
          <RiskBadge
            v-if="riskOf(row.original.id)"
            :level="riskOf(row.original.id)!.level"
            :score="riskOf(row.original.id)!.score"
          />
          <span v-else class="text-sm text-[var(--ui-text-muted)]">-</span>
        </template>

        <template #addedAt-cell="{ row }">
          <span class="text-sm text-[var(--ui-text-muted)]">{{ formatDate(row.original.addedAt) }}</span>
        </template>

        <template #actions-cell="{ row }">
          <UTooltip text="Retirer du réseau">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              size="sm"
              :aria-label="`Retirer ${row.original.firstName} ${row.original.lastName}`"
              @click="openRemove(row.original)"
            />
          </UTooltip>
        </template>
      </UTable>
    </div>

    <UModal v-model:open="addOpen" title="Ajouter un alternant ou stagiaire">
      <template #body>
        <UForm
          :state="addState"
          :schema="addLearnerSchema"
          class="space-y-4"
          @submit="onAddSubmit"
        >
          <UFormField label="Alternant ou stagiaire" name="userId" required>
            <USelectMenu
              v-model="addState.userId"
              value-key="value"
              :items="availableItems"
              :loading="availableStatus === 'pending'"
              :filter-fields="['label', 'description']"
              :search-input="{ placeholder: 'Rechercher un nom ou un email…' }"
              placeholder="Sélectionner une personne…"
              class="w-full"
            >
              <template #empty="{ searchTerm }">
                {{
                  searchTerm
                    ? 'Aucun résultat pour cette recherche'
                    : 'Aucun alternant ou stagiaire disponible'
                }}
              </template>
            </USelectMenu>
          </UFormField>

          <p class="text-xs text-[var(--ui-text-muted)]">
            Seuls les comptes existants avec le rôle Alternant ou Stagiaire, pas encore
            rattachés à votre réseau, sont proposés.
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
            <UButton type="submit" color="neutral" :loading="addPending">
              Ajouter
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <UModal v-model:open="removeOpen" title="Retirer cet alternant ou stagiaire ?">
      <template #body>
        <p class="text-sm text-[var(--ui-text-muted)]">
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

interface RiskEntry {
  student: { id: string; firstName: string; lastName: string }
  score: number
  level: 'ok' | 'vigilance' | 'alerte'
  reasons: string[]
}

const { data: riskData, refresh: refreshRisk } = await useFetch<RiskEntry[]>(
  '/api/dashboard/risk',
  { default: () => [] }
)

const riskByStudent = computed(
  () => new Map((riskData.value ?? []).map((entry) => [entry.student.id, entry]))
)

function riskOf(studentId: string): RiskEntry | undefined {
  return riskByStudent.value.get(studentId)
}

const columns: TableColumn<Learner>[] = [
  { accessorKey: 'fullName', header: 'Nom' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'role', header: 'Rôle' },
  { accessorKey: 'risk', header: 'Risque' },
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

// --- Ajout : sélection parmi les comptes rattachables ------------------------
interface AvailableLearner {
  id: string
  firstName: string
  lastName: string
  email: string
  role: 'Alternant' | 'Stagiaire'
}

const {
  data: availableData,
  status: availableStatus,
  refresh: refreshAvailable
} = await useFetch<AvailableLearner[]>(
  () => `/api/tutors/${tutorId.value}/learners/available`,
  { default: () => [], immediate: !!tutorId.value }
)

// Le nom porte la recherche, l'email lève l'ambiguïté entre homonymes.
const availableItems = computed(() =>
  (availableData.value ?? []).map((u) => ({
    label: `${u.firstName} ${u.lastName}`,
    description: u.email,
    value: u.id
  }))
)

const addLearnerSchema = z.object({
  userId: z.guid('Sélectionnez un alternant ou un stagiaire.')
})

type AddLearnerForm = { userId?: string }

const addOpen = ref(false)
const addState = reactive<AddLearnerForm>({ userId: undefined })
const addPending = ref(false)
const addError = ref<string | null>(null)

function openAdd() {
  addState.userId = undefined
  addError.value = null
  addOpen.value = true
  refreshAvailable()
}

async function onAddSubmit() {
  if (!tutorId.value || !addState.userId) return
  addPending.value = true
  addError.value = null
  const selected = availableItems.value.find((item) => item.value === addState.userId)
  try {
    await $fetch(`/api/tutors/${tutorId.value}/learners`, {
      method: 'POST',
      body: { userId: addState.userId }
    })
    addOpen.value = false
    await Promise.all([refresh(), refreshRisk(), refreshAvailable()])
    toast.add({
      title: 'Personne ajoutée',
      description: `${selected?.label ?? 'Cette personne'} est désormais rattachée à votre réseau.`,
      color: 'success'
    })
  } catch (err: unknown) {
    addError.value = readErrorMessage(err) ?? 'Impossible d\'ajouter cette personne.'
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
    await Promise.all([refresh(), refreshRisk(), refreshAvailable()])
    toast.add({
      title: 'Personne retirée',
      description: `${target.firstName} ${target.lastName} a été retiré de votre réseau.`,
      color: 'success'
    })
  } catch (err: unknown) {
    removeError.value = readErrorMessage(err) ?? 'Impossible de retirer cette personne.'
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
