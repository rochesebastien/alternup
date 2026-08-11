<template>
  <AuthShell>
    <div>
      <div class="mb-8">
        <h1 class="text-2xl font-semibold tracking-tight text-[var(--ui-text)]">Connexion</h1>
        <p class="text-sm text-[var(--ui-text-muted)] mt-1.5">
          Accédez à votre espace Alternup.
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
        :schema="loginInputSchema"
        :validate-on="['blur', 'change']"
        class="space-y-4"
        @submit="onSubmit"
      >
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

        <UFormField label="Mot de passe" name="password" required>
          <UInput
            v-model="state.password"
            type="password"
            autocomplete="current-password"
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
          label="Se connecter"
        />
      </UForm>

      <p class="text-sm text-[var(--ui-text-muted)] mt-6">
        Pas encore de compte ?
        <NuxtLink to="/register" class="font-medium text-[var(--ui-text)] underline underline-offset-4 hover:no-underline">
          S'inscrire
        </NuxtLink>
      </p>
    </div>
  </AuthShell>
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
