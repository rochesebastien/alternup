<template>
  <div class="w-full px-6 py-10 space-y-6">
    <PageHeader
      title="Mon tuteur"
      subtitle="La personne qui suit votre alternance ou votre stage."
    />

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      :title="error.statusMessage ?? 'Chargement impossible'"
      description="Les informations de votre tuteur n'ont pas pu être chargées. Réessayez plus tard."
    />

    <div
      v-else-if="status === 'pending'"
      class="flex justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="animate-spin h-6 w-6 text-[var(--ui-text-dimmed)]"
      />
    </div>

    <div
      v-else-if="!tutors.length"
      class="rounded-md border border-dashed border-[var(--ui-border)] p-8 text-center text-sm text-[var(--ui-text-muted)]"
    >
      Aucun tuteur ne vous est rattaché pour le moment. Rapprochez-vous de votre
      établissement ou de votre entreprise pour être invité·e.
    </div>

    <div
      v-else
      class="grid grid-cols-1 lg:grid-cols-2 gap-4"
    >
      <section
        v-for="tutor in tutors"
        :key="tutor.id"
        class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5"
      >
        <div class="flex items-start gap-4">
          <span
            class="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--ui-bg-accented)] text-sm font-semibold text-[var(--ui-text)]"
            aria-hidden="true"
          >
            {{ initials(tutor) }}
          </span>
          <div class="min-w-0">
            <h2 class="text-base font-semibold text-[var(--ui-text)] truncate">
              {{ tutor.firstName }} {{ tutor.lastName }}
            </h2>
            <p class="text-sm text-[var(--ui-text-muted)]">
              Tuteur
            </p>
            <a
              :href="`mailto:${tutor.email}`"
              class="mt-1 inline-flex items-center gap-1.5 text-sm text-[var(--ui-text-toned)] hover:underline underline-offset-4"
            >
              <UIcon
                name="i-lucide-mail"
                class="size-4 shrink-0 text-[var(--ui-text-dimmed)]"
              />
              {{ tutor.email }}
            </a>
            <p class="mt-1 text-xs text-[var(--ui-text-muted)]">
              Vous suit depuis le {{ formatDate(tutor.addedAt) }}.
            </p>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <UButton
            color="neutral"
            icon="i-lucide-message-circle"
            :to="`/alternant/messages/${tutor.conversationId}`"
          >
            Envoyer un message
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-map-pin"
            to="/alternant/visites"
          >
            Visites
          </UButton>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
/** Miroir du payload de GET /api/me/tutors (interface locale, cf. dashboard). */
interface MyTutor {
  id: string
  firstName: string
  lastName: string
  email: string
  addedAt: string
  conversationId: string
}

const { data, status, error } = await useFetch<MyTutor[]>('/api/me/tutors', {
  default: () => []
})
const tutors = computed(() => data.value ?? [])

function initials(tutor: MyTutor): string {
  return `${tutor.firstName.charAt(0)}${tutor.lastName.charAt(0)}`.toUpperCase()
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value))
}
</script>
