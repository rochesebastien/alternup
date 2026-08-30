<template>
  <div class="min-h-screen flex flex-col bg-[var(--ui-bg)] text-[var(--ui-text)]">
    <!-- ============== NAV (Linear-style) ============== -->
    <!-- `scroll-lock-pad` : la nav est `fixed`, donc calée sur le viewport et non
         sur `<body>`. Elle échappe au `padding-right` que Reka pose sur le body
         quand une modale/un menu verrouille le scroll, et sauterait de la largeur
         de la scrollbar à chaque ouverture. Voir assets/css/main.css. -->
    <nav
      class="scroll-lock-pad fixed top-0 left-0 right-0 z-50 h-14 border-b border-[var(--ui-border)] bg-[var(--ui-bg)]/85 backdrop-blur print:hidden"
      aria-label="Principal"
    >
      <div class="w-full h-full px-6 flex items-center justify-between gap-6">
        <div class="flex items-center gap-8">
          <NuxtLink :to="homeLink" class="flex items-center gap-2" aria-label="alternup, accueil">
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
            <!-- Liens propres à chaque layout (public / tuteur / alternant). -->
            <slot name="links" :nav-link-class="navLinkClass" />
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
            <!-- `:modal="false"` : un menu de navigation n'a aucune raison de
                 verrouiller la page. Par défaut UDropdownMenu est modal, ce qui
                 masque la scrollbar et pose `pointer-events: none` sur le body —
                 d'où un reflow au moment même où Floating UI positionne le
                 panneau (première frame mal calée). En non-modal, aucun verrou,
                 et l'on s'aligne sur <NotificationBell> (UPopover) qui n'en pose
                 déjà pas. Contrepartie assumée : pas de piège de focus. -->
            <UDropdownMenu :items="accountItems" :modal="false" :content="{ align: 'end' }">
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
            <slot name="mobile-links" :close="closeMobile" :link-class="mobileLinkClass" />
          </div>
        </div>
      </Transition>
    </nav>

    <main class="flex-grow pt-14 print:pt-0">
      <!-- Les vues applicatives sont centrées avec des marges latérales ;
           les pages publiques et d'authentification restent pleine largeur. -->
      <div :class="fullBleed ? '' : 'max-w-7xl mx-auto w-full print:max-w-none'">
        <slot />
      </div>
    </main>

    <!-- Dock apprenant : navigation de Suivi et choix de l'apprenant suivi.
         Desktop uniquement (le menu burger garde ses liens), hors pages
         marketing et d'authentification. -->
    <LearnerDock v-if="dock && loggedIn" />

    <!-- ============== FOOTER ============== -->
    <!-- Footer marketing complet uniquement sur les pages publiques -->
    <footer v-if="marketingFooter" class="mt-auto bg-[#1F1F1E] text-[#cfcfcb] py-16 print:hidden">
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
</template>

<script setup lang="ts">
import { landingPageFor } from '~/shared/utils/auth-redirect'

/**
 * Coquille commune des layouts (nav fixe, footer, dock) : chaque layout fournit
 * ses liens via les slots `#links` (desktop) et `#mobile-links` (menu burger)
 * et règle le rendu via les props.
 */
withDefaults(
  defineProps<{
    /** Contenu pleine largeur (pages marketing et d'authentification). */
    fullBleed?: boolean
    /** Footer marketing complet plutôt que le footer minimal. */
    marketingFooter?: boolean
    /** Affiche le dock apprenant (coin bas-droit) quand connecté. */
    dock?: boolean
  }>(),
  { fullBleed: false, marketingFooter: false, dock: false }
)

const config = useRuntimeConfig()
const appVersion = config.public.appVersion

const { loggedIn, user, clear: clearSession } = useUserSession()

// Le logo mène au landing de l'espace du rôle connecté, sinon à l'accueil.
const homeLink = computed(() =>
  loggedIn.value && user.value ? landingPageFor(user.value.role) : '/'
)

// Liens de la nav desktop : hover en carré jaune de marque, page active en
// fond inversé (noir en clair / blanc en sombre). `paths` accepte plusieurs
// racines pour une entrée qui couvrirait plusieurs sections.
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

// Style commun des liens du menu mobile, partagé avec les layouts via le slot.
const mobileLinkClass
  = 'text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors'

// Menu du compte (nav) : lien vers le profil, puis déconnexion en rouge.
const accountItems = computed(() => [
  [{ label: 'Mon compte', icon: 'i-lucide-user', to: '/account' }],
  [{ label: 'Déconnexion', icon: 'i-lucide-log-out', color: 'error' as const, onSelect: () => onLogout() }]
])

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

function closeMobile() {
  mobileOpen.value = false
}

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
