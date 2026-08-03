<template>
  <div class="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4 py-16">
    <div class="w-full max-w-sm">
      <div class="mb-8">
        <h1 class="text-2xl font-semibold tracking-tight text-[var(--ui-text)]">Créer un compte</h1>
        <p class="text-sm text-[var(--ui-text-muted)] mt-1.5">
          Choisissez votre rôle pour commencer.
        </p>
      </div>

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

        <UFormField label="Email" name="email" required>
          <UInput
            v-model="state.email"
            type="email"
            placeholder="vous@exemple.com"
            autocomplete="email"
            size="lg"
            class="w-full"
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

        <UFormField label="Rôle" name="role" required>
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
  </div>
</template>

<script setup lang="ts">
import { Role } from '~/shared/utils/enums'
import type { FormSubmitEvent } from '@nuxt/ui'
import { registerInputSchema, type RegisterInput } from '~/shared/utils/auth-credentials'
import { resolvePostLoginPath } from '~/shared/utils/auth-redirect'

definePageMeta({ auth: false })

const { fetch: refreshSession, user } = useUserSession()

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
    await $fetch('/api/auth/register', { method: 'POST', body: event.data })
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
