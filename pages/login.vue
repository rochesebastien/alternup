<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4 py-12">
    <UCard class="w-full max-w-md">
      <UAuthForm
        :schema="loginInputSchema"
        :fields="fields"
        :state="state"
        title="Connexion"
        description="Accédez à votre espace Alternup."
        icon="i-lucide-log-in"
        :submit="{ label: 'Se connecter', loading: pending, block: true, color: 'primary' }"
        @submit="onSubmit"
      >
        <template #footer>
          <p class="text-sm text-center text-gray-500">
            Pas encore de compte ?
            <NuxtLink to="/register" class="text-primary-600 hover:underline">
              S'inscrire
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
import type { FormSubmitEvent } from '@nuxt/ui'
import { loginInputSchema, type LoginInput } from '~/shared/utils/auth-credentials'
import { resolvePostLoginPath } from '~/shared/utils/auth-redirect'

definePageMeta({ auth: false })

const route = useRoute()
const { fetch: refreshSession, user } = useUserSession()

const state = reactive<Partial<LoginInput>>({
  email: undefined,
  password: undefined
})

const fields = [
  { name: 'email', label: 'Email', type: 'text' as const, placeholder: 'vous@exemple.com', autocomplete: 'email' },
  { name: 'password', label: 'Mot de passe', type: 'password' as const, autocomplete: 'current-password' }
]

const pending = ref(false)
const serverError = ref<string | null>(null)

async function onSubmit(event: FormSubmitEvent<LoginInput>) {
  pending.value = true
  serverError.value = null
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: event.data })
    await refreshSession()
    if (!user.value) {
      serverError.value = 'Session indisponible. Réessayez.'
      return
    }
    const requested = typeof route.query.redirect === 'string' ? route.query.redirect : null
    await navigateTo(resolvePostLoginPath(user.value.role, requested))
  } catch (err: unknown) {
    const e = err as { statusMessage?: string; data?: { statusMessage?: string } }
    serverError.value = e.data?.statusMessage || e.statusMessage || 'Identifiants invalides.'
  } finally {
    pending.value = false
  }
}
</script>
