<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4 py-12">
    <UCard class="w-full max-w-md">
      <UAuthForm
        :schema="registerInputSchema"
        :fields="fields"
        :state="state"
        title="Créer un compte"
        description="Choisissez votre rôle pour commencer."
        icon="i-lucide-user-plus"
        :submit="{ label: 'Créer mon compte', loading: pending, block: true, color: 'primary' }"
        @submit="onSubmit"
      >
        <template #footer>
          <p class="text-sm text-center text-gray-500">
            Déjà inscrit ?
            <NuxtLink to="/login" class="text-primary-600 hover:underline">
              Se connecter
            </NuxtLink>
          </p>
        </template>
      </UAuthForm>

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

const state = reactive<Partial<RegisterInput>>({
  firstName: undefined,
  lastName: undefined,
  email: undefined,
  password: undefined,
  role: Role.Alternant
})

const fields = [
  { name: 'firstName', label: 'Prénom', type: 'text' as const },
  { name: 'lastName', label: 'Nom', type: 'text' as const },
  { name: 'email', label: 'Email', type: 'text' as const, placeholder: 'vous@exemple.com', autocomplete: 'email' },
  {
    name: 'password',
    label: 'Mot de passe',
    type: 'password' as const,
    autocomplete: 'new-password',
    help: '8 caractères minimum.'
  },
  {
    name: 'role',
    label: 'Rôle',
    type: 'select' as const,
    items: [
      { label: 'Alternant', value: Role.Alternant },
      { label: 'Stagiaire', value: Role.Stagiaire },
      { label: 'Tuteur', value: Role.Tutor }
    ]
  }
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
