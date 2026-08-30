<script setup lang="ts">
import { visitModeLabel } from '~/shared/utils/tutor-visits'

// --- Types ------------------------------------------------------------------
interface Person {
  id: string
  firstName: string
  lastName: string
}

interface TutorVisit {
  id: string
  tutorId: string
  studentId: string
  scheduledAt: string
  mode: string | null
  location: string | null
  status: string
  summary: string | null
  nextSteps: string | null
  student?: Person
  tutor?: Person
}

// L'API renvoie déjà les seules visites de l'apprenant connecté.
const { data: visitsData } = await useFetch<TutorVisit[]>(
  '/api/tutor-visits',
  { default: () => [] }
)

const visits = computed<TutorVisit[]>(() => visitsData.value ?? [])

// --- Formatage des dates ----------------------------------------------------
const dateFmt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' })
const timeFmt = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit'
})

function formatDate(value: string): string {
  return dateFmt.format(new Date(value))
}

function formatTime(value: string): string {
  return timeFmt.format(new Date(value))
}
</script>

<template>
  <div class="w-full px-6 py-10 space-y-6">
    <PageHeader title="Visites" />

    <div
      v-if="visits.length === 0"
      class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
    >
      Aucune visite planifiée pour le moment.
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="visit in visits"
        :key="visit.id"
        class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5 space-y-3"
      >
        <div class="space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-base font-semibold">
              {{ visit.tutor?.firstName }} {{ visit.tutor?.lastName }}
            </span>
            <VisitStatusBadge :status="visit.status" />
          </div>
          <p class="text-sm text-[var(--ui-text-muted)]">
            {{ formatDate(visit.scheduledAt) }} · {{ formatTime(visit.scheduledAt) }}
          </p>
          <p class="text-sm text-[var(--ui-text-dimmed)]">
            {{ visitModeLabel(visit.mode) }}
            <template v-if="visit.location"> · {{ visit.location }}</template>
          </p>
        </div>

        <div
          v-if="visit.summary"
          class="rounded-lg bg-[var(--ui-bg-muted)] p-4 space-y-3"
        >
          <div class="space-y-1">
            <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
              Compte-rendu
            </p>
            <p class="text-sm text-[var(--ui-text)] whitespace-pre-line">
              {{ visit.summary }}
            </p>
          </div>
          <div v-if="visit.nextSteps" class="space-y-1">
            <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
              Prochaines étapes
            </p>
            <p class="text-sm text-[var(--ui-text)] whitespace-pre-line">
              {{ visit.nextSteps }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
