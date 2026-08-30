<template>
  <!-- Page d'erreur globale (404 et erreurs fatales) : rendue à la place de
       app.vue, elle recompose un shell minimal (logo + footer) cohérent avec
       AppShell sans en dépendre. -->
  <UApp :tooltip="{ delayDuration: 200, skipDelayDuration: 300 }">
    <div class="min-h-screen flex flex-col bg-[var(--ui-bg)]">
      <header class="h-14 flex items-center px-6">
        <NuxtLink :to="homePath" class="flex items-center gap-2" aria-label="alternup, accueil">
          <!-- Même permutation CSS light/dark que AppShell : le logo est visible
               dès le premier rendu, sans attendre l'hydratation. -->
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
      </header>

      <main class="relative flex-1 flex items-center justify-center overflow-hidden px-6 py-16">
        <!-- Halo décoratif aux couleurs de marque, derrière le contenu. -->
        <div
          aria-hidden="true"
          class="pointer-events-none absolute left-1/2 top-1/2 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-brand-500)] opacity-20 blur-3xl dark:opacity-10"
        />

        <div class="relative max-w-md text-center">
          <!-- Le code en très grand, dans le jaune de marque : c'est lui le
               visuel de la page. -->
          <p
            aria-hidden="true"
            class="select-none text-[clamp(6rem,22vw,10rem)] font-semibold leading-none tracking-tighter text-[var(--color-brand-500)]"
          >
            {{ code }}
          </p>

          <h1 class="mt-4 text-2xl font-semibold tracking-tight text-[var(--ui-text)]">
            {{ is404 ? 'Page introuvable' : 'Une erreur est survenue' }}
          </h1>
          <p class="mt-3 text-sm text-[var(--ui-text-muted)]">
            <template v-if="is404">
              Cette page n'existe pas ou a été déplacée. Vérifiez l'adresse,
              ou repartez de l'accueil.
            </template>
            <template v-else>
              Quelque chose s'est mal passé de notre côté. Réessayez dans un
              instant, ou repartez de l'accueil.
            </template>
          </p>

          <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
            <UButton color="neutral" icon="i-lucide-house" @click="goHome">
              Retour à l'accueil
            </UButton>
            <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" @click="goBack">
              Page précédente
            </UButton>
          </div>
        </div>
      </main>

      <footer class="mt-auto border-t border-[var(--ui-border)]">
        <div class="w-full px-6 h-14 flex items-center text-xs text-[var(--ui-text-dimmed)]">
          <span>© 2026 Alternup</span>
        </div>
      </footer>
    </div>
  </UApp>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'
import { landingPageFor } from '~/shared/utils/auth-redirect'

const props = defineProps<{ error: NuxtError }>()

const code = computed<number>(() => props.error.statusCode ?? 500)
const is404 = computed<boolean>(() => code.value === 404)

// « L'accueil » dépend de la session : le landing de l'espace du rôle pour un
// utilisateur connecté, la landing publique sinon.
const { loggedIn, user } = useUserSession()
const homePath = computed<string>(() =>
  loggedIn.value && user.value ? landingPageFor(user.value.role) : '/'
)

// `clearError` est indispensable : sans lui l'état d'erreur persiste et la
// navigation suivante re-rend cette page.
function goHome(): void {
  clearError({ redirect: homePath.value })
}

function goBack(): void {
  clearError()
  window.history.back()
}

useHead({
  title: is404.value ? 'Page introuvable — Alternup' : 'Erreur — Alternup'
})
</script>
