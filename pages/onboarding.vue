<template>
  <div class="w-full max-w-2xl mx-auto px-6 pb-16 pt-6 sm:pt-[10vh]">
    <!-- Écran de fin -->
    <div v-if="done && user" class="mt-10">
      <div
        class="size-12 rounded-full bg-[var(--ui-primary)] text-black flex items-center justify-center"
        aria-hidden="true"
      >
        <UIcon name="i-lucide-check" class="size-6" />
      </div>
      <h1 class="mt-6 text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--ui-text)]">
        C'est tout bon, {{ user.firstName }} !
      </h1>
      <p class="mt-3 text-base text-[var(--ui-text-muted)]">
        {{ doneDescription }}
      </p>
      <div class="mt-8 flex flex-wrap items-center gap-3">
        <UButton
          color="neutral"
          size="lg"
          :label="primaryCta.label"
          :to="primaryCta.to"
          trailing-icon="i-lucide-arrow-right"
        />
        <UButton
          v-if="secondaryCta"
          color="neutral"
          variant="outline"
          size="lg"
          :label="secondaryCta.label"
          :to="secondaryCta.to"
        />
      </div>
    </div>

    <template v-else-if="user">
      <div class="flex justify-end mb-6">
        <UButton
          color="neutral"
          variant="link"
          size="sm"
          class="text-[var(--ui-text-muted)]"
          :label="again ? 'Annuler' : 'Compléter plus tard'"
          :loading="skipping"
          @click="onSkip"
        />
      </div>

      <UAlert
        v-if="serverError"
        class="mb-6"
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :title="serverError"
      />

      <Questionnaire
        v-model="answers"
        :items="items"
        :submitting="pending"
        submit-label="Terminer"
        @submit="onSubmit"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { landingPageFor } from '~/shared/utils/auth-redirect'
import {
  onboardingItemsFor,
  type OnboardingProfileView
} from '~/shared/utils/onboarding'
import type { QuestionnaireAnswers } from '~/shared/utils/questionnaire'

useHead({ title: 'Bienvenue - Alternup' })

const route = useRoute()
const { user, fetch: refreshSession } = useUserSession()

/** `?again=1` : questionnaire refait depuis « Mon compte » (réponses pré-remplies). */
const again = computed(() => route.query.again === '1')

// Réponses déjà enregistrées (questionnaire refait, ou interrompu après un
// premier envoi) : elles pré-remplissent les questions.
const { data: existing } = await useFetch<OnboardingProfileView | null>('/api/onboarding', {
  default: () => null
})

const answers = ref<QuestionnaireAnswers>(toAnswers(existing.value))

function toAnswers(profile: OnboardingProfileView | null): QuestionnaireAnswers {
  if (!profile) return {}
  const { updatedAt: _updatedAt, ...rest } = profile
  return rest
}

const items = computed(() =>
  user.value ? onboardingItemsFor(user.value.role, user.value.firstName) : []
)

const pending = ref(false)
const skipping = ref(false)
const done = ref(false)
const serverError = ref<string | null>(null)

function readErrorMessage(err: unknown, fallback: string): string {
  const e = err as {
    statusMessage?: string
    data?: { statusMessage?: string; issues?: Array<{ message: string }> }
  }
  return e.data?.issues?.[0]?.message || e.data?.statusMessage || e.statusMessage || fallback
}

async function onSubmit(payload: QuestionnaireAnswers) {
  pending.value = true
  serverError.value = null
  try {
    await $fetch('/api/onboarding', { method: 'POST', body: payload })
    // La session porte `onboarded` : la rafraîchir libère la navigation.
    await refreshSession()
    done.value = true
    window.scrollTo({ top: 0 })
  } catch (err) {
    serverError.value = readErrorMessage(err, "Impossible d'enregistrer vos réponses.")
  } finally {
    pending.value = false
  }
}

async function onSkip() {
  if (!user.value) return
  skipping.value = true
  try {
    if (again.value) {
      await navigateTo('/account')
      return
    }
    await $fetch('/api/onboarding/skip', { method: 'POST' })
    await refreshSession()
    await navigateTo(landingPageFor(user.value.role))
  } catch (err) {
    serverError.value = readErrorMessage(err, 'Impossible de passer cette étape.')
  } finally {
    skipping.value = false
  }
}

// ─── Écran de fin : message et raccourcis adaptés aux réponses ──────────────

const doneDescription = computed(() => {
  if (!user.value) return ''
  if (again.value) return 'Vos réponses ont été mises à jour.'
  if (user.value.role === 'Tutor') {
    return 'Votre espace est prêt. Prochaine étape : inviter vos alternants et stagiaires, ils recevront un lien pour créer leur compte et rejoindre votre réseau.'
  }
  if (answers.value.situation === 'en_recherche') {
    return 'Votre espace est prêt. De nouvelles offres d\'alternance arrivent chaque jour : commencez votre veille dès maintenant.'
  }
  return 'Votre espace est prêt : missions, calendrier, rapports et échanges avec votre tuteur vous attendent.'
})

const primaryCta = computed(() => {
  if (!user.value) return { label: 'Continuer', to: '/' }
  if (again.value) return { label: 'Retour à mon compte', to: '/account' }
  if (user.value.role === 'Tutor') {
    return { label: 'Inviter un apprenant', to: '/tuteur/alternants' }
  }
  if (answers.value.situation === 'en_recherche') {
    return { label: 'Découvrir les offres', to: '/alternant/offres' }
  }
  return { label: 'Accéder à mon espace', to: landingPageFor(user.value.role) }
})

const secondaryCta = computed(() => {
  if (!user.value || again.value) return null
  const landing = landingPageFor(user.value.role)
  return primaryCta.value.to === landing ? null : { label: 'Tableau de bord', to: landing }
})
</script>
