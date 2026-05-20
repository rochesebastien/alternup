<template>
  <div class="min-h-[80vh] flex items-center justify-center px-4 py-12">
    <UCard class="w-full max-w-md">
      <div class="flex flex-col items-center text-center mb-6">
        <span class="iconify i-lucide:log-in size-8 text-primary mb-2" aria-hidden="true" />
        <h1 class="text-xl font-semibold">Connexion</h1>
        <p class="text-sm text-muted mt-1">Accédez à votre espace Alternup.</p>
      </div>

      <UForm
        :state="state"
        :schema="loginInputSchema"
        :validate-on="['blur', 'change', 'submit']"
        class="space-y-5"
        @submit="onSubmit"
      >
        <UFormField label="Email" name="email" required>
          <UInput
            v-model="state.email"
            type="email"
            placeholder="vous@exemple.com"
            autocomplete="email"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Mot de passe" name="password" required>
          <UInput
            v-model="state.password"
            type="password"
            autocomplete="current-password"
            class="w-full"
          />
        </UFormField>

        <UButton
          type="submit"
          color="primary"
          block
          :loading="pending"
          label="Se connecter"
        />
      </UForm>

      <p class="text-sm text-center text-muted mt-4">
        Pas encore de compte ?
        <NuxtLink to="/register" class="text-primary-600 hover:underline">
          S'inscrire
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
import type { FormSubmitEvent } from '@nuxt/ui'
import { loginInputSchema, type LoginInput } from '~/shared/utils/auth-credentials'
import { resolvePostLoginPath } from '~/shared/utils/auth-redirect'

definePageMeta({ auth: false })

const route = useRoute()
const { fetch: refreshSession, user } = useUserSession()

const state = reactive<{ email: string; password: string }>({
  email: '',
  password: ''
})

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
