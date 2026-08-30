<template>
  <div class="w-full px-6 py-10 space-y-6">
    <PageHeader
      title="Rapports d'étape"
      subtitle="Rapports de vos alternants à suivre."
    />

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="Erreur de chargement"
      :description="error.message"
    />

    <div v-if="toReviewCount > 0" class="flex items-center gap-2">
      <UBadge color="info" variant="subtle" class="font-normal">
        {{ toReviewCount }} à valider
      </UBadge>
    </div>

    <div
      v-if="status === 'pending'"
      class="flex justify-center py-12"
    >
      <UIcon name="i-lucide-loader-2" class="animate-spin h-6 w-6 text-[var(--ui-text-dimmed)]" />
    </div>

    <div
      v-else-if="reports.length === 0"
      class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
    >
      {{ focusName ? `Aucun rapport de ${focusName} pour le moment.` : 'Aucun rapport à suivre pour le moment.' }}
    </div>

    <ul v-else class="space-y-3">
      <li v-for="report in reports" :key="report.id">
        <NuxtLink
          :to="`/tuteur/rapports/${report.id}`"
          class="block rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5 transition-colors hover:border-[var(--ui-border-accented)]"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="text-base font-semibold text-[var(--ui-text)] truncate">
                {{ report.title }}
              </p>
              <p
                v-if="report.student"
                class="text-sm text-[var(--ui-text-muted)] mt-0.5"
              >
                {{ report.student.firstName }} {{ report.student.lastName }}
              </p>
              <p class="text-sm text-[var(--ui-text-dimmed)] mt-0.5">
                {{ formatRange(report.periodStart, report.periodEnd) }}
              </p>
            </div>
            <ReportStatusBadge :status="report.status" />
          </div>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
interface StudentRef {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface ProgressReportItem {
  id: string
  studentId: string
  tutorId: string
  periodStart: string
  periodEnd: string
  title: string
  body: string
  difficulties: string | null
  learnings: string | null
  status: string
  tutorFeedback: string | null
  submittedAt: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  student?: StudentRef
}

const { data, status, error } = await useFetch<ProgressReportItem[]>(
  '/api/progress-reports',
  { default: () => [] }
)

// Apprenant suivi (sélecteur de la barre de navigation) : la liste se
// restreint à ses rapports. Sans sélection, `filterByFocus` ne filtre rien.
const { focusName, filterByFocus } = useLearnerFocus()

const reports = computed<ProgressReportItem[]>(() =>
  filterByFocus(data.value ?? [], (r) => r.studentId)
)
const toReviewCount = computed<number>(
  () => reports.value.filter((r) => r.status === 'soumis').length
)

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value))
}

function formatRange(startVal: string, endVal: string): string {
  return `du ${formatDate(startVal)} au ${formatDate(endVal)}`
}
</script>
