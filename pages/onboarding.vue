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

      <!-- Compte rendu des actions du tuteur -->
      <div v-if="result?.invitation || result?.suivi" class="mt-8 space-y-3">
        <div
          v-if="result.invitation"
          class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-4"
        >
          <template v-if="result.invitation.kind === 'invited'">
            <p class="flex items-center gap-2 text-sm font-medium text-[var(--ui-text)]">
              <UIcon name="i-lucide-mail-plus" class="size-4 text-[var(--ui-text-muted)]" />
              Invitation prête pour {{ result.invitation.firstName || result.invitation.email }}
            </p>
            <p class="mt-1 text-sm text-[var(--ui-text-muted)]">
              Transmettez-lui ce lien : il crée son compte et rejoint directement votre réseau.
            </p>
            <div class="mt-3 flex gap-2">
              <UInput :model-value="result.invitation.inviteUrl" readonly class="w-full font-mono" />
              <UButton
                color="neutral"
                variant="outline"
                :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
                :label="copied ? 'Copié' : 'Copier'"
                @click="copyInviteUrl"
              />
            </div>
          </template>
          <p v-else class="flex items-center gap-2 text-sm font-medium text-[var(--ui-text)]">
            <UIcon name="i-lucide-user-check" class="size-4 text-[var(--ui-text-muted)]" />
            {{ result.invitation.firstName }} {{ result.invitation.lastName }} avait déjà un compte :
            il est maintenant dans votre réseau.
          </p>
        </div>

        <div
          v-if="result.suivi"
          class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-4"
        >
          <p class="flex items-center gap-2 text-sm font-medium text-[var(--ui-text)]">
            <UIcon name="i-lucide-calendar-check" class="size-4 text-[var(--ui-text-muted)]" />
            {{ suiviSummary }}
          </p>
          <p class="mt-1 text-sm text-[var(--ui-text-muted)]">
            {{ result.suivi.count }} rendez-vous placés dans votre calendrier, du
            {{ formatDay(result.suivi.firstStart) }} au {{ formatDay(result.suivi.lastStart) }}.
          </p>
        </div>
      </div>

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
  ONBOARDING_LABELS,
  onboardingActionsFrom,
  onboardingItemsFor,
  type OnboardingActionsResult,
  type OnboardingProfileView,
  type OnboardingSubmitResult
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

// Actions de démarrage (premier apprenant, point de suivi) : tuteur, première
// connexion seulement. Le serveur applique la même règle.
// Figé au premier rendu : la session passe à `onboarded` pendant l'envoi,
// la liste des étapes ne doit pas changer sous les pieds du questionnaire.
const actionsAtStart = user.value?.role === 'Tutor' && !user.value.onboarded

const answers = ref<QuestionnaireAnswers>({
  // Créneau proposé par défaut pour le point de suivi hebdomadaire.
  ...(actionsAtStart ? { suiviDebut: '10:00', suiviFin: '10:30' } : {}),
  ...toAnswers(existing.value)
})

function toAnswers(profile: OnboardingProfileView | null): QuestionnaireAnswers {
  if (!profile) return {}
  const { updatedAt: _updatedAt, ...rest } = profile
  return rest
}

const items = computed(() =>
  user.value
    ? onboardingItemsFor(user.value.role, user.value.firstName, { actions: actionsAtStart })
    : []
)

const pending = ref(false)
const skipping = ref(false)
const done = ref(false)
const result = ref<OnboardingActionsResult | null>(null)
const copied = ref(false)
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
    const response = await $fetch<OnboardingSubmitResult>('/api/onboarding', {
      method: 'POST',
      body: {
        ...payload,
        actions: actionsAtStart ? onboardingActionsFrom(payload, new Date()) : undefined
      }
    })
    result.value = response.actions
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

async function copyInviteUrl() {
  if (result.value?.invitation?.kind !== 'invited') return
  await navigator.clipboard.writeText(result.value.invitation.inviteUrl)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

const suiviSummary = computed(() => {
  const jour = ONBOARDING_LABELS.jour[String(answers.value.suiviJour)] ?? ''
  return `Point de suivi chaque ${jour.toLowerCase()} de ${answers.value.suiviDebut} à ${answers.value.suiviFin}`
})

const doneDescription = computed(() => {
  if (!user.value) return ''
  if (again.value) return 'Vos réponses ont été mises à jour.'
  if (user.value.role === 'Tutor') {
    return result.value?.invitation
      ? 'Votre espace est prêt. Voici ce qui a été mis en place :'
      : 'Votre espace est prêt. Prochaine étape : inviter vos alternants et stagiaires, ils recevront un lien pour créer leur compte et rejoindre votre réseau.'
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
    return result.value?.invitation
      ? { label: 'Accéder à mon espace', to: landingPageFor(user.value.role) }
      : { label: 'Inviter un apprenant', to: '/tuteur/alternants' }
  }
  if (answers.value.situation === 'en_recherche') {
    return { label: 'Découvrir les offres', to: '/alternant/offres' }
  }
  return { label: 'Accéder à mon espace', to: landingPageFor(user.value.role) }
})

const secondaryCta = computed(() => {
  if (!user.value || again.value) return null
  if (result.value?.suivi) return { label: 'Voir mon calendrier', to: '/tuteur/calendar' }
  const landing = landingPageFor(user.value.role)
  return primaryCta.value.to === landing ? null : { label: 'Tableau de bord', to: landing }
})
</script>
