<template>
  <div class="w-full max-w-3xl mx-auto px-6 py-10 space-y-6">
    <PageHeader title="Mon compte" subtitle="Informations de votre profil Alternup." />

    <!-- Identité : lecture + édition du prénom / nom -->
    <section
      v-if="user"
      class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-6 space-y-5"
    >
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-3 min-w-0">
          <span
            class="size-11 shrink-0 rounded-full bg-[var(--ui-bg-accented)] text-[var(--ui-text)] text-sm font-semibold flex items-center justify-center"
          >
            {{ initials }}
          </span>
          <div class="min-w-0">
            <p class="text-base font-semibold text-[var(--ui-text)] truncate">
              {{ user.firstName }} {{ user.lastName }}
            </p>
            <p class="text-sm text-[var(--ui-text-muted)] truncate">{{ user.email }}</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <UBadge color="neutral" variant="soft">{{ roleLabel }}</UBadge>
          <UButton
            v-if="!editing"
            color="neutral"
            variant="outline"
            size="sm"
            icon="i-lucide-pencil"
            label="Modifier"
            @click="openEdit"
          />
        </div>
      </div>

      <!-- Lecture -->
      <dl v-if="!editing" class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
        <div>
          <dt class="text-xs uppercase tracking-wide text-[var(--ui-text-dimmed)]">Prénom</dt>
          <dd class="mt-1 text-sm text-[var(--ui-text)]">{{ user.firstName }}</dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wide text-[var(--ui-text-dimmed)]">Nom</dt>
          <dd class="mt-1 text-sm text-[var(--ui-text)]">{{ user.lastName }}</dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wide text-[var(--ui-text-dimmed)]">Email</dt>
          <dd class="mt-1 text-sm text-[var(--ui-text)]">{{ user.email }}</dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wide text-[var(--ui-text-dimmed)]">Rôle</dt>
          <dd class="mt-1 text-sm text-[var(--ui-text)]">{{ roleLabel }}</dd>
        </div>
      </dl>

      <!-- Édition -->
      <UForm
        v-else
        :state="profileState"
        :schema="accountProfileUpdateSchema"
        :validate-on="['blur', 'change']"
        class="space-y-4"
        @submit="onProfileSubmit"
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Prénom" name="firstName" required>
            <UInput v-model="profileState.firstName" autocomplete="given-name" class="w-full" />
          </UFormField>
          <UFormField label="Nom" name="lastName" required>
            <UInput v-model="profileState.lastName" autocomplete="family-name" class="w-full" />
          </UFormField>
        </div>

        <p class="text-xs text-[var(--ui-text-muted)]">
          L'adresse e-mail et le rôle ne sont pas modifiables ici : contactez votre tuteur si
          l'un des deux est incorrect.
        </p>

        <UAlert
          v-if="profileError"
          color="error"
          variant="soft"
          icon="i-lucide-triangle-alert"
          :title="profileError"
        />

        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" label="Annuler" @click="editing = false" />
          <UButton
            type="submit"
            color="neutral"
            icon="i-lucide-check"
            label="Enregistrer"
            :loading="profilePending"
          />
        </div>
      </UForm>
    </section>

    <!-- Mot de passe -->
    <section class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-6 space-y-5">
      <div class="flex items-start justify-between gap-4 flex-wrap">
        <div class="min-w-0">
          <h2 class="text-base font-semibold text-[var(--ui-text)]">Mot de passe</h2>
          <p class="text-sm text-[var(--ui-text-muted)] mt-1">
            {{ MIN_PASSWORD_LENGTH }} caractères minimum. Votre mot de passe actuel est demandé
            pour confirmer le changement.
          </p>
        </div>
        <UButton
          v-if="!changingPassword"
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-key-round"
          label="Changer"
          class="shrink-0"
          @click="openPassword"
        />
      </div>

      <UForm
        v-if="changingPassword"
        :state="passwordState"
        :schema="accountPasswordUpdateSchema"
        :validate-on="['blur', 'change']"
        class="space-y-4"
        @submit="onPasswordSubmit"
      >
        <UFormField label="Mot de passe actuel" name="currentPassword" required>
          <UInput
            v-model="passwordState.currentPassword"
            type="password"
            autocomplete="current-password"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Nouveau mot de passe" name="newPassword" required>
            <UInput
              v-model="passwordState.newPassword"
              type="password"
              autocomplete="new-password"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Confirmer le nouveau mot de passe" name="confirmPassword" required>
            <UInput
              v-model="passwordState.confirmPassword"
              type="password"
              autocomplete="new-password"
              class="w-full"
            />
          </UFormField>
        </div>

        <UAlert
          v-if="passwordError"
          color="error"
          variant="soft"
          icon="i-lucide-triangle-alert"
          :title="passwordError"
        />

        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            label="Annuler"
            @click="changingPassword = false"
          />
          <UButton
            type="submit"
            color="neutral"
            icon="i-lucide-check"
            label="Mettre à jour"
            :loading="passwordPending"
          />
        </div>
      </UForm>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Role } from '~/shared/utils/enums'
import {
  MIN_PASSWORD_LENGTH,
  accountPasswordUpdateSchema,
  accountProfileUpdateSchema
} from '~/shared/utils/account'

const { user, fetch: refreshSession } = useUserSession()
const toast = useToast()

const ROLE_LABELS: Record<string, string> = {
  [Role.Tutor]: 'Tuteur',
  [Role.Alternant]: 'Alternant',
  [Role.Stagiaire]: 'Stagiaire'
}
const roleLabel = computed(() => (user.value ? ROLE_LABELS[user.value.role] ?? user.value.role : ''))

const initials = computed(() =>
  user.value
    ? `${user.value.firstName.charAt(0)}${user.value.lastName.charAt(0)}`.toUpperCase()
    : ''
)

// --- Identité ---------------------------------------------------------------
const editing = ref(false)
const profilePending = ref(false)
const profileError = ref<string | null>(null)
const profileState = reactive({ firstName: '', lastName: '' })

function openEdit(): void {
  profileState.firstName = user.value?.firstName ?? ''
  profileState.lastName = user.value?.lastName ?? ''
  profileError.value = null
  editing.value = true
}

async function onProfileSubmit(): Promise<void> {
  profilePending.value = true
  profileError.value = null
  try {
    await $fetch('/api/account/profile', {
      method: 'PUT',
      body: { firstName: profileState.firstName, lastName: profileState.lastName }
    })
    // La session porte le nom affiché dans la navigation : la recharger.
    await refreshSession()
    editing.value = false
    toast.add({ title: 'Profil mis à jour', color: 'success' })
  } catch (err: unknown) {
    profileError.value = readErrorMessage(err) ?? 'Impossible de mettre à jour le profil.'
  } finally {
    profilePending.value = false
  }
}

// --- Mot de passe -----------------------------------------------------------
const changingPassword = ref(false)
const passwordPending = ref(false)
const passwordError = ref<string | null>(null)
const passwordState = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

function resetPassword(): void {
  passwordState.currentPassword = ''
  passwordState.newPassword = ''
  passwordState.confirmPassword = ''
  passwordError.value = null
}

function openPassword(): void {
  resetPassword()
  changingPassword.value = true
}

async function onPasswordSubmit(): Promise<void> {
  passwordPending.value = true
  passwordError.value = null
  try {
    await $fetch('/api/account/password', { method: 'PUT', body: { ...passwordState } })
    resetPassword()
    changingPassword.value = false
    toast.add({ title: 'Mot de passe mis à jour', color: 'success' })
  } catch (err: unknown) {
    passwordError.value = readErrorMessage(err) ?? 'Impossible de changer le mot de passe.'
  } finally {
    passwordPending.value = false
  }
}

function readErrorMessage(err: unknown): string | null {
  const e = err as {
    statusMessage?: string
    data?: { statusMessage?: string; issues?: Array<{ message: string }> }
  }
  return e.data?.statusMessage || e.data?.issues?.[0]?.message || e.statusMessage || null
}
</script>
