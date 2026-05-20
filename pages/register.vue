<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4 py-12">
    <UCard class="w-full max-w-md">
      <div class="flex flex-col items-center text-center mb-6">
        <span class="iconify i-lucide:user-plus size-8 text-primary mb-2" aria-hidden="true" />
        <h1 class="text-xl font-semibold">Créer un compte</h1>
        <p class="text-sm text-muted mt-1">Choisissez votre rôle pour commencer.</p>
      </div>

      <UForm
        :state="state"
        :schema="registerInputSchema"
        :validate-on="['blur', 'change']"
        class="space-y-5"
        @submit="onSubmit"
      >
        <UFormField label="Prénom" name="firstName" required>
          <UInput v-model="state.firstName" autocomplete="given-name" class="w-full" />
        </UFormField>

        <UFormField label="Nom" name="lastName" required>
          <UInput v-model="state.lastName" autocomplete="family-name" class="w-full" />
        </UFormField>

        <UFormField label="Email" name="email" required>
          <UInput
            v-model="state.email"
            type="email"
            placeholder="vous@exemple.com"
            autocomplete="email"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Mot de passe" name="password" help="8 caractères minimum." required>
          <UInput
            v-model="state.password"
            type="password"
            autocomplete="new-password"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Rôle" name="role" required>
          <USelectMenu
            v-model="state.role"
            value-key="value"
            :items="roleItems"
            class="w-full"
          />
        </UFormField>

        <UButton
          type="submit"
          color="primary"
          block
          :loading="pending"
          label="Créer mon compte"
        />
      </UForm>

      <p class="text-sm text-center text-muted mt-4">
        Déjà inscrit ?
        <NuxtLink to="/login" class="text-primary-600 hover:underline">
          Se connecter
        </NuxtLink>
      </p>

      <UAlert
        v-if="serverError"
        class="mt-4"
        color="error"
        variant="soft"
        :title="serverError"
      />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { Role } from '@prisma/client'
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
