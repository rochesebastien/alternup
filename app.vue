<template>
  <UApp>
    <div class="min-h-screen bg-gray-50 flex flex-col">
      <header class="bg-white shadow">
        <div
          class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4"
        >
          <NuxtLink to="/" class="flex items-center gap-2">
            <UIcon name="i-lucide-graduation-cap" class="h-7 w-7 text-emerald-600" />
            <span class="text-2xl font-bold text-emerald-600">Alternup</span>
          </NuxtLink>

          <nav class="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
            <NuxtLink
              to="/"
              class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
            >
              Accueil
            </NuxtLink>
            <template v-if="isTutor">
              <NuxtLink
                to="/alternants"
                class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
              >
                Mes alternants
              </NuxtLink>
              <NuxtLink
                to="/projects"
                class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
              >
                Mes projets
              </NuxtLink>
            </template>
            <template v-if="isLearner">
              <NuxtLink
                to="/courses"
                class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
              >
                Mes cours
              </NuxtLink>
              <NuxtLink
                to="/missions"
                class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
              >
                Mes missions
              </NuxtLink>
            </template>
            <NuxtLink
              v-if="loggedIn"
              to="/calendar"
              class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100"
            >
              Calendrier
            </NuxtLink>
          </nav>

          <div class="flex items-center gap-2">
            <template v-if="loggedIn && user">
              <span class="hidden sm:inline text-sm text-gray-600">
                {{ user.firstName }} {{ user.lastName }}
              </span>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-log-out"
                size="sm"
                :loading="loggingOut"
                @click="onLogout"
              >
                Déconnexion
              </UButton>
            </template>
            <template v-else>
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                to="/login"
              >
                Connexion
              </UButton>
              <UButton color="primary" size="sm" to="/register">
                Inscription
              </UButton>
            </template>
          </div>
        </div>
      </header>

      <main class="flex-grow">
        <NuxtPage />
      </main>

      <footer class="bg-white py-6 mt-auto border-t border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center md:text-left">
          <p class="text-sm text-gray-500">
            © 2025 Alternup — Gérez vos alternances
          </p>
          <p class="text-xs text-gray-400 mt-1">Version: {{ appVersion }}</p>
        </div>
      </footer>
    </div>
  </UApp>
</template>

<script setup lang="ts">
import { Role } from '@prisma/client'

const config = useRuntimeConfig()
const appVersion = config.public.appVersion

const { loggedIn, user, clear: clearSession } = useUserSession()
const isTutor = computed(() => user.value?.role === Role.Tutor)
const isLearner = computed(
  () => user.value?.role === Role.Alternant || user.value?.role === Role.Stagiaire
)

const loggingOut = ref(false)

async function onLogout() {
  loggingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await clearSession()
    await navigateTo('/login')
  } finally {
    loggingOut.value = false
  }
}
</script>
