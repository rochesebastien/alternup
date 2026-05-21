<template>
  <UApp>
    <div class="min-h-screen flex flex-col bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <!-- ============== NAV (Linear-style) ============== -->
      <nav
        class="fixed top-0 left-0 right-0 z-50 h-14 border-b border-[var(--ui-border)] bg-[var(--ui-bg)]/85 backdrop-blur"
        aria-label="Principal"
      >
        <div class="mx-auto max-w-7xl h-full px-6 flex items-center justify-between gap-6">
          <div class="flex items-center gap-8">
            <NuxtLink to="/" class="flex items-center gap-2" aria-label="alternup, accueil">
              <ClientOnly>
                <img
                  :src="logoSrc"
                  alt="alternup"
                  width="110"
                  height="24"
                  class="h-6 w-auto"
                >
                <template #fallback>
                  <span class="font-extrabold tracking-tight text-base">alternup</span>
                </template>
              </ClientOnly>
            </NuxtLink>

            <div class="hidden md:flex items-center gap-6 text-sm font-medium">
              <template v-if="!loggedIn">
                <NuxtLink to="/" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors">Produit</NuxtLink>
                <NuxtLink to="/" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors">Fonctionnalités</NuxtLink>
                <NuxtLink to="/" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors">Tarifs</NuxtLink>
              </template>
              <template v-else>
                <NuxtLink
                  v-if="isTutor"
                  to="/alternants"
                  class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors"
                >
                  Mes alternants
                </NuxtLink>
                <NuxtLink
                  v-if="isTutor"
                  to="/projects"
                  class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors"
                >
                  Mes projets
                </NuxtLink>
                <NuxtLink
                  v-if="isLearner"
                  to="/courses"
                  class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors"
                >
                  Mes cours
                </NuxtLink>
                <NuxtLink
                  v-if="isLearner"
                  to="/missions"
                  class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors"
                >
                  Mes missions
                </NuxtLink>
                <NuxtLink
                  to="/calendar"
                  class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors"
                >
                  Calendrier
                </NuxtLink>
              </template>
            </div>
          </div>

          <div class="flex items-center gap-1 sm:gap-2">
            <UButton
              :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
              color="neutral"
              variant="ghost"
              size="sm"
              class="rounded-full"
              :aria-label="isDark ? 'Activer le thème clair' : 'Activer le thème sombre'"
              @click="toggleColorMode"
            />

            <template v-if="loggedIn && user">
              <span class="hidden lg:inline text-sm text-[var(--ui-text-muted)] mr-1">
                {{ user.firstName }} {{ user.lastName }}
              </span>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-log-out"
                size="sm"
                class="rounded-full"
                :loading="loggingOut"
                :aria-label="'Déconnexion'"
                @click="onLogout"
              />
            </template>
            <template v-else>
              <UButton
                color="neutral"
                variant="ghost"
                to="/login"
                size="sm"
                class="rounded-full px-3 hidden sm:inline-flex"
              >
                Connexion
              </UButton>
              <UButton
                color="primary"
                to="/register"
                size="sm"
                class="rounded-full font-semibold px-4"
              >
                Créer un compte
              </UButton>
            </template>

            <UButton
              :icon="mobileOpen ? 'i-lucide-x' : 'i-lucide-menu'"
              color="neutral"
              variant="ghost"
              size="sm"
              class="rounded-full md:hidden"
              aria-label="Menu"
              @click="mobileOpen = !mobileOpen"
            />
          </div>
        </div>

        <!-- Mobile menu panel -->
        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 -translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div
            v-if="mobileOpen"
            class="md:hidden border-b border-[var(--ui-border)] bg-[var(--ui-bg)]/95 backdrop-blur"
          >
            <div class="mx-auto max-w-7xl px-6 py-4 flex flex-col gap-3 text-sm font-medium">
              <template v-if="!loggedIn">
                <NuxtLink to="/" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Produit</NuxtLink>
                <NuxtLink to="/features" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Fonctionnalités</NuxtLink>
                <NuxtLink to="/" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Tarifs</NuxtLink>
              </template>
              <template v-else>
                <NuxtLink v-if="isTutor" to="/alternants" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Mes alternants</NuxtLink>
                <NuxtLink v-if="isTutor" to="/projects" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Mes projets</NuxtLink>
                <NuxtLink v-if="isLearner" to="/courses" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Mes cours</NuxtLink>
                <NuxtLink v-if="isLearner" to="/missions" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Mes missions</NuxtLink>
                <NuxtLink to="/calendar" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Calendrier</NuxtLink>
              </template>
            </div>
          </div>
        </Transition>
      </nav>

      <main class="flex-grow pt-14">
        <NuxtPage />
      </main>

      <!-- ============== FOOTER ============== -->
      <footer class="mt-auto bg-[#1F1F1E] text-[#cfcfcb] py-16">
        <div class="max-w-7xl mx-auto px-6 text-center">
          <NuxtLink to="/" class="inline-flex items-center gap-2" aria-label="alternup, accueil">
            <img
              src="/images/logo_nav_dark.png"
              alt="alternup"
              width="140"
              height="32"
              class="h-8 w-auto"
            >
          </NuxtLink>
          <p class="text-sm text-[#8a8a86] mt-6">
            © 2026 Alternup — Le suivi des alternants et des stagiaires réinventé. Tous droits réservés.
          </p>
          <p class="text-xs text-[#6b6b6a] mt-2">Version {{ appVersion }}</p>
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

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
const logoSrc = computed(() =>
  isDark.value ? '/images/logo_nav_dark.png' : '/images/logo_nav_light.png'
)

function toggleColorMode() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

const loggingOut = ref(false)
const mobileOpen = ref(false)

const route = useRoute()
watch(() => route.fullPath, () => { mobileOpen.value = false })

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
