<script setup lang="ts">
import type { StudentLivret } from '~/shared/utils/livret'
import { visitModeLabel } from '~/shared/utils/tutor-visits'

// Livret d'alternance imprimable : la sortie « officielle » attendue par les
// écoles et les OPCO. Export PDF via l'impression du navigateur (aucune lib).
// Littéral de chaîne pour le rôle (pas de valeur d'enum Prisma côté composant,
// cf. taches/lecons.md n°6) — même convention que la fiche 360°.
const route = useRoute()

const { data: livret, status, error } = await useFetch<StudentLivret>(
  () => `/api/users/${route.params.id}/livret`
)

const studentName = computed<string>(() =>
  livret.value ? `${livret.value.student.firstName} ${livret.value.student.lastName}` : ''
)

const tutorName = computed<string>(() =>
  livret.value ? `${livret.value.tutor.firstName} ${livret.value.tutor.lastName}` : ''
)

/* --- Dates --- */
const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

function formatDate(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : dateFormatter.format(date)
}

function formatRange(start: string, end: string): string {
  return `du ${formatDate(start)} au ${formatDate(end)}`
}

/* --- Export PDF --- */
function onPrint(): void {
  if (import.meta.client) window.print()
}
</script>

<template>
  <div class="w-full px-6 py-10 space-y-8 print:px-0 print:py-0">
    <UButton
      variant="link"
      color="neutral"
      icon="i-lucide-arrow-left"
      :to="`/tuteur/alternants/${route.params.id}`"
      class="-ml-2 px-2 text-[var(--ui-text-muted)] print:hidden"
    >
      Retour à la fiche
    </UButton>

    <div v-if="status === 'pending'" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="animate-spin h-6 w-6 text-[var(--ui-text-dimmed)]" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      title="Livret indisponible"
      description="Cette personne n'existe pas ou n'est pas sous votre responsabilité."
    />

    <template v-else-if="livret">
      <!-- En-tête imprimé -->
      <div class="print-only border-b border-[var(--ui-border)] pb-3 mb-6">
        <p class="text-lg font-extrabold tracking-tight">alternup</p>
        <p class="text-xs uppercase tracking-wide text-[var(--ui-text-muted)]">
          Livret de l'alternant
        </p>
      </div>

      <PageHeader
        :title="`Livret de ${studentName}`"
        subtitle="Bulletins, rapports validés, compétences, visites et assiduité."
      >
        <template #actions>
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-printer"
            class="print:hidden"
            @click="onPrint"
          >
            Exporter en PDF
          </UButton>
        </template>
      </PageHeader>

      <!-- 1. Identité -->
      <section class="print-avoid-break">
        <h2 class="text-sm font-semibold text-[var(--ui-text)] mb-3">Identité</h2>
        <dl class="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
              Alternant
            </dt>
            <dd class="text-[var(--ui-text-toned)] mt-0.5">{{ studentName }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
              Statut
            </dt>
            <dd class="text-[var(--ui-text-toned)] mt-0.5">{{ livret.student.role }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
              Courriel
            </dt>
            <dd class="text-[var(--ui-text-toned)] mt-0.5 break-all">
              {{ livret.student.email }}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
              Tuteur
            </dt>
            <dd class="text-[var(--ui-text-toned)] mt-0.5">{{ tutorName }}</dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
              Suivi depuis
            </dt>
            <dd class="text-[var(--ui-text-toned)] mt-0.5">
              {{ formatDate(livret.student.addedAt) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
              Édité le
            </dt>
            <dd class="text-[var(--ui-text-toned)] mt-0.5">
              {{ formatDate(livret.generatedAt) }}
            </dd>
          </div>
        </dl>
      </section>

      <!-- 2. Bilan d'assiduité -->
      <section class="print-avoid-break">
        <h2 class="text-sm font-semibold text-[var(--ui-text)] mb-3">
          Bilan d'assiduité
        </h2>
        <p
          v-if="livret.attendance.total === 0"
          class="text-sm text-[var(--ui-text-muted)]"
        >
          Aucune session pointée.
        </p>
        <div v-else class="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatCard label="Sessions" :value="livret.attendance.total" />
          <StatCard label="Présences" :value="livret.attendance.present" />
          <StatCard label="Absences" :value="livret.attendance.absent" />
          <StatCard label="Retards" :value="livret.attendance.retard" />
          <StatCard
            label="Taux de présence"
            :value="livret.attendance.rate !== null ? `${livret.attendance.rate} %` : '-'"
          />
        </div>
      </section>

      <!-- 3. Carte de compétences -->
      <section class="print-avoid-break">
        <h2 class="text-sm font-semibold text-[var(--ui-text)] mb-3">
          Carte de compétences
          <span
            v-if="livret.competencies.overall !== null"
            class="font-normal text-[var(--ui-text-muted)]"
          >
            · {{ livret.competencies.overall }} % de progression globale
          </span>
        </h2>

        <p
          v-if="livret.competencies.domains.length === 0"
          class="text-sm text-[var(--ui-text-muted)]"
        >
          Aucun référentiel de compétences défini.
        </p>

        <div v-else class="space-y-4">
          <div
            v-for="domain in livret.competencies.domains"
            :key="domain.id"
            class="rounded-lg border border-[var(--ui-border)] p-4 print-avoid-break"
          >
            <div class="flex items-baseline justify-between gap-4">
              <h3 class="text-sm font-semibold text-[var(--ui-text)]">
                {{ domain.label }}
              </h3>
              <span class="text-xs text-[var(--ui-text-muted)]">
                {{ domain.progress !== null ? `${domain.progress} %` : 'Non évalué' }}
              </span>
            </div>

            <ul class="mt-3 space-y-2">
              <li
                v-for="competency in domain.competencies"
                :key="competency.id"
                class="flex items-start justify-between gap-4"
              >
                <div class="min-w-0">
                  <p class="text-sm text-[var(--ui-text-toned)]">
                    {{ competency.label }}
                  </p>
                  <p
                    v-if="competency.comment"
                    class="text-xs text-[var(--ui-text-dimmed)] mt-0.5"
                  >
                    {{ competency.comment }}
                  </p>
                </div>
                <CompetencyLevelBadge :level="competency.level" class="shrink-0" />
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- 4. Bulletins publiés -->
      <section>
        <h2 class="text-sm font-semibold text-[var(--ui-text)] mb-3">
          Bulletins publiés
        </h2>

        <p
          v-if="livret.reportCards.length === 0"
          class="text-sm text-[var(--ui-text-muted)]"
        >
          Aucun bulletin publié.
        </p>

        <div v-else class="space-y-8">
          <article
            v-for="card in livret.reportCards"
            :key="card.id"
            class="space-y-4 print-page-break"
          >
            <div class="flex items-baseline justify-between gap-4 flex-wrap">
              <h3 class="text-base font-semibold text-[var(--ui-text)]">
                {{ card.periodLabel }}
              </h3>
              <p class="text-xs text-[var(--ui-text-muted)]">
                {{ formatRange(card.periodStart, card.periodEnd) }} · publié le
                {{ formatDate(card.publishedAt) }}
              </p>
            </div>

            <ReportCardDocument
              :snapshot="card.snapshot"
              :general-comment="card.generalComment"
            />

            <DocumentSignatures :block="card.signatures" readonly />
          </article>
        </div>
      </section>

      <!-- 5. Rapports d'étape validés -->
      <section>
        <h2 class="text-sm font-semibold text-[var(--ui-text)] mb-3">
          Rapports d'étape validés
        </h2>

        <p v-if="livret.reports.length === 0" class="text-sm text-[var(--ui-text-muted)]">
          Aucun rapport validé.
        </p>

        <div v-else class="space-y-8">
          <article
            v-for="report in livret.reports"
            :key="report.id"
            class="space-y-4 print-page-break"
          >
            <div class="flex items-baseline justify-between gap-4 flex-wrap">
              <h3 class="text-base font-semibold text-[var(--ui-text)]">
                {{ report.title }}
              </h3>
              <p class="text-xs text-[var(--ui-text-muted)]">
                {{ formatRange(report.periodStart, report.periodEnd) }} · validé le
                {{ formatDate(report.reviewedAt) }}
              </p>
            </div>

            <div class="space-y-4 print-avoid-break">
              <div>
                <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide mb-1">
                  Activités réalisées
                </p>
                <p class="text-sm text-[var(--ui-text-toned)] whitespace-pre-line">
                  {{ report.body }}
                </p>
              </div>
              <div v-if="report.difficulties">
                <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide mb-1">
                  Difficultés rencontrées
                </p>
                <p class="text-sm text-[var(--ui-text-toned)] whitespace-pre-line">
                  {{ report.difficulties }}
                </p>
              </div>
              <div v-if="report.learnings">
                <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide mb-1">
                  Apprentissages
                </p>
                <p class="text-sm text-[var(--ui-text-toned)] whitespace-pre-line">
                  {{ report.learnings }}
                </p>
              </div>
              <div v-if="report.tutorFeedback">
                <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide mb-1">
                  Retour du tuteur
                </p>
                <p class="text-sm text-[var(--ui-text-toned)] whitespace-pre-line">
                  {{ report.tutorFeedback }}
                </p>
              </div>
            </div>

            <DocumentSignatures :block="report.signatures" readonly />
          </article>
        </div>
      </section>

      <!-- 6. Visites réalisées -->
      <section class="print-avoid-break">
        <h2 class="text-sm font-semibold text-[var(--ui-text)] mb-3">
          Visites réalisées
        </h2>

        <p v-if="livret.visits.length === 0" class="text-sm text-[var(--ui-text-muted)]">
          Aucune visite réalisée.
        </p>

        <ul v-else class="space-y-3">
          <li
            v-for="visit in livret.visits"
            :key="visit.id"
            class="rounded-lg border border-[var(--ui-border)] p-4 print-avoid-break"
          >
            <div class="flex items-baseline justify-between gap-4 flex-wrap">
              <p class="text-sm font-medium text-[var(--ui-text)]">
                {{ visitModeLabel(visit.mode) }}
                <span v-if="visit.location" class="font-normal text-[var(--ui-text-muted)]">
                  · {{ visit.location }}
                </span>
              </p>
              <p class="text-xs text-[var(--ui-text-muted)]">
                {{ formatDate(visit.scheduledAt) }}
              </p>
            </div>
            <p
              v-if="visit.summary"
              class="text-sm text-[var(--ui-text-toned)] whitespace-pre-line mt-2"
            >
              {{ visit.summary }}
            </p>
            <p
              v-if="visit.nextSteps"
              class="text-xs text-[var(--ui-text-dimmed)] whitespace-pre-line mt-2"
            >
              Prochaines étapes : {{ visit.nextSteps }}
            </p>
          </li>
        </ul>
      </section>

      <p class="print-only text-xs text-[var(--ui-text-dimmed)] pt-6">
        Livret généré par Alternup le {{ formatDate(livret.generatedAt) }}. Les
        signatures reproduites sont horodatées et conservées en base.
      </p>
    </template>
  </div>
</template>
