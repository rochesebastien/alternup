<template>
  <!-- `tooltip` : délai court et global pour toutes les infobulles de l'app. -->
  <UApp :tooltip="{ delayDuration: 200, skipDelayDuration: 300 }">
    <div class="min-h-screen flex flex-col bg-[var(--ui-bg)] text-[var(--ui-text)]">
      <!-- ============== NAV (Linear-style) ============== -->
      <nav
        class="fixed top-0 left-0 right-0 z-50 h-14 border-b border-[var(--ui-border)] bg-[var(--ui-bg)]/85 backdrop-blur print:hidden"
        aria-label="Principal"
      >
        <div class="w-full h-full px-6 flex items-center justify-between gap-6">
          <div class="flex items-center gap-8">
            <NuxtLink :to="loggedIn ? '/dashboard' : '/'" class="flex items-center gap-2" aria-label="alternup, accueil">
              <!-- Les deux variantes sont rendues côté serveur et permutées en CSS
                   selon la classe `dark` : le logo est visible dès le premier
                   rendu, sans attendre l'hydratation. -->
              <img
                src="/images/logo_nav_light.png"
                alt="alternup"
                width="110"
                height="24"
                class="h-6 w-auto dark:hidden"
              >
              <img
                src="/images/logo_nav_dark.png"
                alt="alternup"
                width="110"
                height="24"
                class="h-6 w-auto hidden dark:block"
              >
            </NuxtLink>

            <div class="hidden md:flex items-center gap-2 text-sm font-medium">
              <template v-if="!loggedIn">
                <NuxtLink to="/#product_anchor" :class="navLinkClass()">Produit</NuxtLink>
                <NuxtLink to="/features" :class="navLinkClass('/features')">Fonctionnalités</NuxtLink>
              </template>
              <template v-else>
                <NuxtLink to="/dashboard" :class="navLinkClass('/dashboard')">
                  Tableau de bord
                </NuxtLink>
                <NuxtLink v-if="isTutor" to="/alternants" :class="navLinkClass('/alternants')">
                  Alternants
                </NuxtLink>
                <NuxtLink v-if="isTutor" to="/projects" :class="navLinkClass('/projects')">
                  Projets
                </NuxtLink>
                <NuxtLink v-if="isLearner" to="/courses" :class="navLinkClass('/courses')">
                  Cours
                </NuxtLink>
                <NuxtLink v-if="isLearner" to="/missions" :class="navLinkClass('/missions')">
                  Missions
                </NuxtLink>
                <NuxtLink to="/calendar" :class="navLinkClass('/calendar')">
                  Calendrier
                </NuxtLink>
                <UDropdownMenu :items="suiviItems" :content="{ align: 'start' }">
                  <button
                    type="button"
                    class="flex items-center gap-1"
                    :class="navLinkClass(...SUIVI_PATHS)"
                  >
                    Suivi
                    <UIcon name="i-lucide-chevron-down" class="size-4" />
                  </button>
                </UDropdownMenu>
                <!-- Apprenant suivi : filtre transverse aux pages de Suivi. -->
                <LearnerFocusSwitcher class="hidden md:block ml-1" />
              </template>
            </div>
          </div>

          <div class="flex items-center gap-1 sm:gap-2">
            <ChangelogDialog />
            <UTooltip :text="themeLabel">
              <UButton
                :icon="isDark ? 'i-lucide-sun' : 'i-lucide-moon'"
                color="neutral"
                variant="ghost"
                size="sm"
                class="rounded-full text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
                :aria-label="themeLabel"
                @click="toggleColorMode"
              />
            </UTooltip>

            <template v-if="loggedIn && user">
              <NotificationBell />
              <UDropdownMenu :items="accountItems" :content="{ align: 'end' }">
                <UButton
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  icon="i-lucide-circle-user-round"
                  trailing-icon="i-lucide-chevron-down"
                  class="rounded-full text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
                  :loading="loggingOut"
                  aria-label="Menu du compte"
                >
                  <span class="hidden lg:inline">
                    {{ user.firstName }} {{ user.lastName }}
                  </span>
                </UButton>
              </UDropdownMenu>
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
              class="rounded-full md:hidden text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]"
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
            <div class="w-full px-6 py-4 flex flex-col gap-3 text-sm font-medium">
              <template v-if="!loggedIn">
                <NuxtLink to="/#product_anchor" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Produit</NuxtLink>
                <NuxtLink to="/features" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Fonctionnalités</NuxtLink>
              </template>
              <template v-else>
                <NuxtLink to="/dashboard" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Tableau de bord</NuxtLink>
                <NuxtLink v-if="isTutor" to="/alternants" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Alternants</NuxtLink>
                <NuxtLink v-if="isTutor" to="/projects" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Projets</NuxtLink>
                <NuxtLink v-if="isLearner" to="/courses" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Cours</NuxtLink>
                <NuxtLink v-if="isLearner" to="/missions" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Missions</NuxtLink>
                <NuxtLink to="/calendar" class="text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="mobileOpen = false">Calendrier</NuxtLink>
                <!-- Même sélecteur qu'en desktop : il pilote les pages de Suivi listées juste après. -->
                <LearnerFocusSwitcher block class="my-1" />
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
        <!-- Les vues applicatives sont centrées avec des marges latérales ;
             les pages publiques et d'authentification restent pleine largeur. -->
        <div :class="isFullBleed ? '' : 'max-w-7xl mx-auto w-full print:max-w-none'">
          <NuxtPage />
        </div>
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
            © 2026 Alternup. Le suivi des alternants et des stagiaires réinventé.
          </p>
        </div>
      </footer>

      <!-- Footer minimal sur les pages applicatives -->
      <footer v-else class="mt-auto border-t border-[var(--ui-border)] print:hidden">
        <div class="w-full px-6 h-14 flex items-center justify-between text-xs text-[var(--ui-text-dimmed)]">
          <span>© 2026 Alternup</span>
          <span>v{{ appVersion }}</span>
        </div>
      </footer>
    </div>
  </UApp>
</template>

<script setup lang="ts">
import { Role } from '~/shared/utils/enums'

const config = useRuntimeConfig()
const appVersion = config.public.appVersion

const { loggedIn, user, clear: clearSession } = useUserSession()
const isTutor = computed(() => user.value?.role === Role.Tutor)
const isLearner = computed(
  () => user.value?.role === Role.Alternant || user.value?.role === Role.Stagiaire
)

// Liens de la nav desktop : hover en carré jaune de marque, page active en
// fond inversé (noir en clair / blanc en sombre). `paths` accepte plusieurs
// racines pour les entrées regroupées (menu « Suivi »).
const SUIVI_PATHS = ['/presences', '/rapports', '/bulletins', '/competences', '/visites', '/annonces', '/messages']

function navLinkClass(...paths: string[]) {
  const active = paths.some(
    (p) => route.path === p || route.path.startsWith(`${p}/`)
  )
  return [
    'px-2.5 py-1.5 rounded-md transition-colors',
    active
      ? 'bg-[var(--ui-bg-inverted)] text-[var(--ui-text-inverted)]'
      : 'text-[var(--ui-text-muted)] hover:bg-[#F1DE02] hover:text-[#1F1F1E]'
  ]
}

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

// Menu du compte (nav) : lien vers le profil, puis déconnexion en rouge.
const accountItems = computed(() => [
  [{ label: 'Mon compte', icon: 'i-lucide-user', to: '/account' }],
  [{ label: 'Déconnexion', icon: 'i-lucide-log-out', color: 'error' as const, onSelect: () => onLogout() }]
])

// Compteur du centre de notifications, alimenté par <NotificationBell /> (nav
// desktop) et réutilisé tel quel dans le menu mobile — aucune requête en double.
const notificationCount = useNotificationCountState()

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
// Même libellé pour l'infobulle et l'aria-label : une seule source de vérité.
const themeLabel = computed(() =>
  isDark.value ? 'Activer le thème clair' : 'Activer le thème sombre'
)

function toggleColorMode() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

const loggingOut = ref(false)
const mobileOpen = ref(false)

const route = useRoute()
watch(() => route.fullPath, () => { mobileOpen.value = false })

// Footer marketing complet uniquement sur les pages publiques (landing, features, tarifs)
const isMarketing = computed(() => ['/', '/features'].includes(route.path))

// Pages rendues pleine largeur (sections marketing et fond des pages d'auth) ;
// toutes les autres vues sont centrées avec des marges latérales.
const isFullBleed = computed(() =>
  ['/', '/features', '/login', '/register'].includes(route.path)
)

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
