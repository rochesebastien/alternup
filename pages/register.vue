<template>
  <AuthShell>
    <div>
      <div class="mb-8">
        <h1 class="text-2xl font-semibold tracking-tight text-[var(--ui-text)]">Créer un compte</h1>
        <p class="text-sm text-[var(--ui-text-muted)] mt-1.5">
          {{ invitation ? 'Finalisez votre inscription pour rejoindre votre tuteur.' : 'Choisissez votre rôle pour commencer.' }}
        </p>
      </div>

      <UAlert
        v-if="invitation"
        class="mb-5"
        color="success"
        variant="soft"
        icon="i-lucide-mail-check"
        :title="`Invitation de ${invitation.tutor.firstName} ${invitation.tutor.lastName}`"
        :description="`Vous serez placé sous sa responsabilité en tant ${invitation.role === 'Alternant' ? 'qu\'alternant' : 'que stagiaire'}.`"
      />

      <UAlert
        v-if="inviteError"
        class="mb-5"
        color="warning"
        variant="soft"
        icon="i-lucide-mail-x"
        title="Invitation invalide"
        :description="inviteError"
      />

      <UAlert
        v-if="serverError"
        class="mb-5"
        color="error"
        variant="soft"
        :title="serverError"
      />

      <UForm
        :state="state"
        :schema="registerInputSchema"
        :validate-on="['blur', 'change']"
        class="space-y-4"
        @submit="onSubmit"
      >
        <div class="grid grid-cols-2 gap-3">
          <UFormField label="Prénom" name="firstName" required>
            <UInput v-model="state.firstName" autocomplete="given-name" size="lg" class="w-full" />
          </UFormField>

          <UFormField label="Nom" name="lastName" required>
            <UInput v-model="state.lastName" autocomplete="family-name" size="lg" class="w-full" />
          </UFormField>
        </div>

        <UFormField
          label="Email"
          name="email"
          required
          :help="invitation ? 'Imposé par l\'invitation.' : undefined"
        >
          <UInput
            v-model="state.email"
            type="email"
            placeholder="vous@exemple.com"
            autocomplete="email"
            size="lg"
            class="w-full"
            :disabled="!!invitation"
          />
        </UFormField>

        <UFormField label="Mot de passe" name="password" help="8 caractères minimum." required>
          <UInput
            v-model="state.password"
            type="password"
            autocomplete="new-password"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField v-if="!invitation" label="Rôle" name="role" required>
          <USelectMenu
            v-model="state.role"
            value-key="value"
            :items="roleItems"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UButton
          type="submit"
          color="neutral"
          block
          size="lg"
          class="mt-2"
          :loading="pending"
          label="Créer mon compte"
        />
      </UForm>

      <p class="text-sm text-[var(--ui-text-muted)] mt-6">
        Déjà inscrit ?
        <NuxtLink to="/login" class="font-medium text-[var(--ui-text)] underline underline-offset-4 hover:no-underline">
          Se connecter
        </NuxtLink>
      </p>
    </div>
  </AuthShell>
</template>

<script setup lang="ts">
import { Role } from '~/shared/utils/enums'
import type { FormSubmitEvent } from '@nuxt/ui'
import { registerInputSchema, type RegisterInput } from '~/shared/utils/auth-credentials'
import type { PublicInvitation } from '~/shared/utils/invitations'
import { resolvePostLoginPath } from '~/shared/utils/auth-redirect'

definePageMeta({ auth: false })

const route = useRoute()
const { fetch: refreshSession, user } = useUserSession()

// Onboarding sur invitation (?invite=<token>) : pré-remplit et fige l'email,
// masque le choix du rôle (imposés par l'invitation, revérifiés côté serveur).
const inviteToken = computed(() =>
  typeof route.query.invite === 'string' ? route.query.invite : null
)

// `PublicInvitation | null` explicitement : sans invitation dans l'URL, la
// requête n'est jamais lancée et `data` reste sur le défaut `null`.
const { data: invitation, error: inviteFetchError } = await useFetch<PublicInvitation | null>(
  () => `/api/invitations/token/${inviteToken.value}`,
  { immediate: !!inviteToken.value, default: () => null }
)

const inviteError = computed(() => {
  if (!inviteToken.value || !inviteFetchError.value) return null
  const e = inviteFetchError.value as { statusCode?: number }
  return e.statusCode === 410
    ? 'Cette invitation a expiré. Demandez à votre tuteur de vous renvoyer un lien.'
    : 'Ce lien d\'invitation n\'est plus valide. Vous pouvez créer un compte librement ci-dessous.'
})

const state = reactive<{
  firstName: string
  lastName: string
  email: string
  password: string
  role: Role
}>({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: Role.Alternant
})

watch(
  invitation,
  (inv) => {
    if (!inv) return
    state.email = inv.email
    state.firstName = inv.firstName ?? state.firstName
    state.lastName = inv.lastName ?? state.lastName
    state.role = inv.role
  },
  { immediate: true }
)

const roleItems = [
  { label: 'Alternant', value: Role.Alternant },
  { label: 'Stagiaire', value: Role.Stagiaire },
  { label: 'Tuteur', value: Role.Tutor }
]

const pending = ref(false)
const serverError = ref<string | null>(null)

async function onSubmit(event: FormSubmitEvent<RegisterInput>) {
  pending.value = true
  serverError.value = null
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: invitation.value
        ? { ...event.data, inviteToken: inviteToken.value }
        : event.data
    })
    await refreshSession()
    if (user.value) {
      await navigateTo(resolvePostLoginPath(user.value.role))
    }
  } catch (err: unknown) {
    const e = err as { statusMessage?: string; data?: { statusMessage?: string } }
    serverError.value = e.data?.statusMessage || e.statusMessage || 'Impossible de créer le compte.'
  } finally {
    pending.value = false
  }
}
</script>
