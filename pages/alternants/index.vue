<template>
  <div class="w-full px-6 py-10 space-y-6">
    <PageHeader
      title="Alternants & stagiaires"
      :subtitle="`${learners.length} ${learners.length > 1 ? 'personnes rattachées' : 'personne rattachée'}`"
    >
      <template #actions>
        <div class="flex items-center gap-2">
          <UTabs
            v-model="viewMode"
            :items="viewTabs"
            :content="false"
            size="xs"
            color="neutral"
            aria-label="Mode d'affichage"
          />
          <UButton color="neutral" variant="outline" icon="i-lucide-user-plus" @click="openAdd">
            Attribution
          </UButton>
          <UButton color="neutral" icon="i-lucide-plus" @click="openInvite">
            Ajouter
          </UButton>
        </div>
      </template>
    </PageHeader>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      :title="error.statusMessage ?? 'Erreur de chargement'"
      :description="errorDetail(error)"
    />

    <!-- Vue cards (par défaut) : adaptée aux petits effectifs d'un tuteur. -->
    <div v-if="viewMode === 'cards'">
      <div
        v-if="learners.length === 0"
        class="rounded-lg border border-dashed border-[var(--ui-border)] p-10 text-center text-sm text-[var(--ui-text-muted)]"
      >
        Aucun alternant rattaché pour le moment.
      </div>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <div
          v-for="learner in learners"
          :key="learner.id"
          class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5 flex flex-col gap-4 transition-colors hover:border-[var(--ui-border-accented)]"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="size-10 shrink-0 rounded-full bg-[var(--ui-bg-accented)] flex items-center justify-center text-sm font-semibold text-[var(--ui-text)]"
                aria-hidden="true"
              >
                {{ initialsOf(learner) }}
              </div>
              <div class="min-w-0">
                <NuxtLink
                  :to="`/alternants/${learner.id}`"
                  class="block font-medium text-[var(--ui-text)] truncate hover:underline underline-offset-4"
                >
                  {{ learner.firstName }} {{ learner.lastName }}
                </NuxtLink>
                <p class="text-sm text-[var(--ui-text-muted)] truncate">{{ learner.email }}</p>
              </div>
            </div>
            <UTooltip text="Retirer du réseau">
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-trash-2"
                size="sm"
                :aria-label="`Retirer ${learner.firstName} ${learner.lastName}`"
                @click="openRemove(learner)"
              />
            </UTooltip>
          </div>

          <div class="flex items-center justify-between gap-2 mt-auto">
            <div class="flex items-center gap-2">
              <UBadge color="neutral" variant="subtle" class="font-normal">
                {{ learner.role }}
              </UBadge>
              <RiskBadge
                v-if="riskOf(learner.id)"
                :level="riskOf(learner.id)!.level"
                :score="riskOf(learner.id)!.score"
              />
            </div>
            <span class="text-xs text-[var(--ui-text-dimmed)]">
              Ajouté le {{ formatDate(learner.addedAt) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Vue tableau -->
    <div v-else class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] overflow-hidden">
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

    <!-- Suivi des invitations : qui a accepté, qui est en attente, qui a expiré. -->
    <section v-if="invitations.length" class="space-y-3">
      <h2 class="text-sm font-semibold text-[var(--ui-text)]">Invitations</h2>
      <div class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] divide-y divide-[var(--ui-border)]">
        <div
          v-for="inv in invitations"
          :key="inv.id"
          class="p-4 flex items-center justify-between gap-4 flex-wrap"
        >
          <div class="min-w-0">
            <p class="text-sm font-medium text-[var(--ui-text)] truncate">
              {{ inv.firstName || inv.lastName ? `${inv.firstName ?? ''} ${inv.lastName ?? ''}`.trim() : inv.email }}
            </p>
            <p class="text-xs text-[var(--ui-text-muted)] truncate">
              {{ inv.email }} · {{ inv.role }} · Créée le {{ formatDate(inv.createdAt) }}
            </p>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <UBadge
              v-if="statusOf(inv) === 'accepted'"
              color="success"
              variant="soft"
              icon="i-lucide-user-check"
            >
              Acceptée le {{ formatDate(inv.acceptedAt!) }}
            </UBadge>
            <UBadge
              v-else-if="statusOf(inv) === 'pending'"
              color="warning"
              variant="soft"
              icon="i-lucide-clock"
            >
              En attente — expire le {{ formatDate(inv.expiresAt) }}
            </UBadge>
            <UBadge v-else color="neutral" variant="soft" icon="i-lucide-clock-alert">
              Expirée
            </UBadge>

            <UTooltip v-if="statusOf(inv) === 'pending'" text="Copier le lien">
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-copy"
                size="sm"
                :aria-label="`Copier le lien d'invitation de ${inv.email}`"
                @click="copyLink(inv.inviteUrl)"
              />
            </UTooltip>
            <UTooltip :text="statusOf(inv) === 'pending' ? 'Révoquer le lien' : 'Supprimer du suivi'">
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                size="sm"
                :aria-label="`Supprimer l'invitation de ${inv.email}`"
                @click="deleteInvitation(inv)"
              />
            </UTooltip>
          </div>
        </div>
      </div>
    </section>

    <!-- Attribution : rattacher un compte apprenant existant à son réseau. -->
    <UModal v-model:open="addOpen" title="Attribuer un alternant ou stagiaire">
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
              Attribuer
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Ajouter : onboarding par invitation — un lien d'inscription est envoyé
         par email, le compte créé est rattaché automatiquement au tuteur. -->
    <UModal v-model:open="inviteOpen" title="Inviter un alternant ou stagiaire">
      <template #body>
        <div v-if="inviteResult" class="space-y-4">
          <UAlert
            color="success"
            variant="soft"
            icon="i-lucide-link"
            :title="`Lien d'invitation généré pour ${inviteResult.email}`"
            description="Transmettez ce lien à la personne : il est valable 7 jours. La section « Invitations » vous indiquera quand elle l'aura accepté."
          />

          <UFormField label="Lien d'invitation">
            <div class="flex gap-2">
              <UInput :model-value="inviteResult.inviteUrl" readonly class="w-full font-mono" />
              <UTooltip text="Copier le lien">
                <UButton
                  color="neutral"
                  variant="outline"
                  icon="i-lucide-copy"
                  aria-label="Copier le lien d'invitation"
                  @click="copyLink(inviteResult.inviteUrl)"
                />
              </UTooltip>
            </div>
          </UFormField>

          <div class="flex justify-end pt-2">
            <UButton color="neutral" @click="inviteOpen = false">
              Terminer
            </UButton>
          </div>
        </div>

        <UForm
          v-else
          :state="inviteState"
          :schema="invitationCreateSchema"
          class="space-y-4"
          @submit="onInviteSubmit"
        >
          <UFormField label="Email" name="email" required>
            <UInput
              v-model="inviteState.email"
              type="email"
              placeholder="prenom.nom@exemple.com"
              class="w-full"
            />
          </UFormField>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormField label="Prénom" name="firstName">
              <UInput v-model="inviteState.firstName" class="w-full" />
            </UFormField>
            <UFormField label="Nom" name="lastName">
              <UInput v-model="inviteState.lastName" class="w-full" />
            </UFormField>
          </div>

          <UFormField label="Rôle" name="role" required>
            <USelect
              v-model="inviteState.role"
              :items="inviteRoleItems"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <p class="text-xs text-[var(--ui-text-muted)]">
            Un lien d'inscription pré-rempli, valable 7 jours, sera généré : transmettez-le
            à la personne. À la création de son compte, elle sera rattachée automatiquement
            à votre réseau.
          </p>

          <UAlert
            v-if="inviteError"
            color="error"
            variant="soft"
            :title="inviteError"
          />

          <div class="flex justify-end gap-2 pt-2">
            <UButton color="neutral" variant="ghost" @click="inviteOpen = false">
              Annuler
            </UButton>
            <UButton type="submit" color="neutral" icon="i-lucide-link" :loading="invitePending">
              Générer le lien
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
import type { TableColumn, TabsItem } from '@nuxt/ui'
import {
  invitationCreateSchema,
  invitationStatus,
  type InvitationStatus,
  type TutorInvitation
} from '~/shared/utils/invitations'

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

// Bascule cards / tableau — cards par défaut : un tuteur suit peu de personnes.
const viewMode = ref<'cards' | 'table'>('cards')
const viewTabs: TabsItem[] = [
  { value: 'cards', icon: 'i-lucide-layout-grid' },
  { value: 'table', icon: 'i-lucide-table' }
]

function initialsOf(learner: { firstName: string; lastName: string }): string {
  return `${learner.firstName[0] ?? ''}${learner.lastName[0] ?? ''}`.toUpperCase()
}

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

// --- Ajouter : onboarding par lien d'invitation -------------------------------
interface InviteResult {
  id: string
  email: string
  inviteUrl: string
  expiresAt: string
}

const { data: invitationsData, refresh: refreshInvitations } = await useFetch<TutorInvitation[]>(
  '/api/invitations',
  { default: () => [] }
)
const invitations = computed(() => invitationsData.value ?? [])

function statusOf(inv: TutorInvitation): InvitationStatus {
  return invitationStatus(inv)
}

async function deleteInvitation(inv: TutorInvitation) {
  try {
    await $fetch(`/api/invitations/${inv.id}`, { method: 'DELETE' })
    await refreshInvitations()
    toast.add({
      title: statusOf(inv) === 'pending' ? 'Invitation révoquée' : 'Invitation supprimée du suivi',
      color: 'success'
    })
  } catch (err: unknown) {
    toast.add({
      title: readErrorMessage(err) ?? 'Impossible de supprimer cette invitation.',
      color: 'error'
    })
  }
}

type InviteForm = {
  email: string
  firstName: string
  lastName: string
  role: 'Alternant' | 'Stagiaire'
}

const inviteRoleItems = [
  { label: 'Stagiaire', value: 'Stagiaire' },
  { label: 'Alternant', value: 'Alternant' }
]

const inviteOpen = ref(false)
const inviteState = reactive<InviteForm>({
  email: '',
  firstName: '',
  lastName: '',
  role: 'Stagiaire'
})
const invitePending = ref(false)
const inviteError = ref<string | null>(null)
const inviteResult = ref<InviteResult | null>(null)

function openInvite() {
  inviteState.email = ''
  inviteState.firstName = ''
  inviteState.lastName = ''
  inviteState.role = 'Stagiaire'
  inviteError.value = null
  inviteResult.value = null
  inviteOpen.value = true
}

async function onInviteSubmit() {
  invitePending.value = true
  inviteError.value = null
  try {
    inviteResult.value = await $fetch<InviteResult>('/api/invitations', {
      method: 'POST',
      body: {
        email: inviteState.email,
        firstName: inviteState.firstName || undefined,
        lastName: inviteState.lastName || undefined,
        role: inviteState.role
      }
    })
    await refreshInvitations()
  } catch (err: unknown) {
    inviteError.value = readErrorMessage(err) ?? 'Impossible d\'envoyer l\'invitation.'
  } finally {
    invitePending.value = false
  }
}

async function copyLink(url: string) {
  await navigator.clipboard.writeText(url)
  toast.add({ title: 'Lien copié', color: 'success' })
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
