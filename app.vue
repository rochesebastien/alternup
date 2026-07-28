<template>
  <UApp>
    <div class="min-h-screen flex flex-col bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <!-- ============== NAV (Linear-style) ============== -->
      <nav
        class="fixed top-0 left-0 right-0 z-50 h-14 border-b border-[var(--ui-border)] bg-[var(--ui-bg)]/85 backdrop-blur print:hidden"
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
                <NuxtLink to="/product_anchor" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors">Produit</NuxtLink>
                <NuxtLink to="/features" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors">Fonctionnalités</NuxtLink>
                <NuxtLink to="/pricing" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors">Tarifs</NuxtLink>
              </template>
              <template v-else>
                <NuxtLink
                  to="/dashboard"
                  class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors"
                >
                  Tableau de bord
                </NuxtLink>
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
                <UDropdownMenu :items="suiviItems" :content="{ align: 'start' }">
                  <button
                    type="button"
                    class="flex items-center gap-1 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors"
                  >
                    Suivi
                    <UIcon name="i-lucide-chevron-down" class="size-4" />
                  </button>
                </UDropdownMenu>
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
              <NotificationBell />
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
                <NuxtLink to="/dashboard" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Tableau de bord</NuxtLink>
                <NuxtLink v-if="isTutor" to="/alternants" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Mes alternants</NuxtLink>
                <NuxtLink v-if="isTutor" to="/projects" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Mes projets</NuxtLink>
                <NuxtLink v-if="isLearner" to="/courses" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Mes cours</NuxtLink>
                <NuxtLink v-if="isLearner" to="/missions" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Mes missions</NuxtLink>
                <NuxtLink to="/calendar" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Calendrier</NuxtLink>
                <NuxtLink to="/presences" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Présences</NuxtLink>
                <NuxtLink to="/rapports" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Rapports</NuxtLink>
                <NuxtLink to="/annonces" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Annonces</NuxtLink>
                <NuxtLink to="/bulletins" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Bulletins</NuxtLink>
                <NuxtLink to="/competences" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Compétences</NuxtLink>
                <NuxtLink to="/visites" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Visites</NuxtLink>
                <NuxtLink to="/messages" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Messages</NuxtLink>
                <NuxtLink to="/notifications" class="flex items-center gap-2 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">
                  Notifications
                  <span
                    v-if="notificationCount > 0"
                    class="min-w-4 h-4 px-1 rounded-full bg-[var(--ui-error)] text-white text-[10px] font-semibold leading-4 text-center"
                  >
                    {{ notificationCount > 99 ? '99+' : notificationCount }}
                  </span>
                </NuxtLink>
              </template>
            </div>
          </div>
        </Transition>
      </nav>

      <main class="flex-grow pt-14 print:pt-0">
        <NuxtPage />
      </main>

      <!-- ============== FOOTER ============== -->
      <!-- Footer marketing complet uniquement sur les pages publiques -->
      <footer v-if="isMarketing" class="mt-auto bg-[#1F1F1E] text-[#cfcfcb] py-16 print:hidden">
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
            © 2026 Alternup — Le suivi des alternants et des stagiaires réinventé.
          </p>
        </div>
      </footer>

      <!-- Footer minimal sur les pages applicatives -->
      <footer v-else class="mt-auto border-t border-[var(--ui-border)] print:hidden">
        <div class="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between text-xs text-[var(--ui-text-dimmed)]">
          <span>© 2026 Alternup</span>
          <span>v{{ appVersion }}</span>
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

// Modules de suivi regroupés dans un menu déroulant (nav desktop).
const suiviItems = [[
  { label: 'Présences', icon: 'i-lucide-clipboard-check', to: '/presences' },
  { label: 'Rapports', icon: 'i-lucide-file-text', to: '/rapports' },
  { label: 'Bulletins', icon: 'i-lucide-graduation-cap', to: '/bulletins' },
  { label: 'Compétences', icon: 'i-lucide-target', to: '/competences' },
  { label: 'Visites', icon: 'i-lucide-map-pin', to: '/visites' },
  { label: 'Annonces', icon: 'i-lucide-megaphone', to: '/annonces' },
  { label: 'Messages', icon: 'i-lucide-mail', to: '/messages' }
]]

// Compteur du centre de notifications, alimenté par <NotificationBell /> (nav
// desktop) et réutilisé tel quel dans le menu mobile — aucune requête en double.
const notificationCount = useNotificationCountState()

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

// Footer marketing complet uniquement sur les pages publiques (landing, features, tarifs)
const isMarketing = computed(() => ['/', '/features', '/pricing'].includes(route.path))

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
