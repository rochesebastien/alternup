<script setup lang="ts">
import type { ReportCardSnapshot } from '~/shared/utils/report-periods'

// Rendu « document » d'un bulletin : tableau de notes plutôt qu'histogramme,
// pour rester lisible à l'impression (export PDF) comme à l'écran. Le rendu
// dashboard (barres) reste assuré par <ReportCardView /> dans les listes.
const props = defineProps<{
  snapshot: ReportCardSnapshot
  generalComment?: string | null
}>()

/** Note formatée à la française : « 14,5 / 20 », tiret si absente. */
function formatAverage(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '-'
  return `${(Math.round(value * 10) / 10).toString().replace('.', ',')} / 20`
}

const overallDisplay = computed<string>(() =>
  formatAverage(props.snapshot.overallAverage)
)

const rateDisplay = computed<string>(() =>
  props.snapshot.attendance.rate !== null ? `${props.snapshot.attendance.rate} %` : '-'
)
</script>

<template>
  <div class="space-y-6">
    <!-- Moyennes par cours -->
    <section class="print-avoid-break">
      <h3 class="text-sm font-semibold text-[var(--ui-text)] mb-3">
        Moyennes par matière
      </h3>

      <p
        v-if="snapshot.courses.length === 0"
        class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-8 text-center"
      >
        Aucune note enregistrée sur la période.
      </p>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b border-[var(--ui-border)]">
              <th
                class="text-left font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide text-xs py-2"
              >
                Matière
              </th>
              <th
                class="text-right font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide text-xs py-2 w-24"
              >
                Notes
              </th>
              <th
                class="text-right font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide text-xs py-2 w-32"
              >
                Moyenne
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="course in snapshot.courses"
              :key="course.title"
              class="border-b border-[var(--ui-border-muted)]"
            >
              <td class="py-2 text-[var(--ui-text)]">{{ course.title }}</td>
              <td class="py-2 text-right text-[var(--ui-text-muted)]">
                {{ course.count }}
              </td>
              <td class="py-2 text-right font-medium text-[var(--ui-text)]">
                {{ formatAverage(course.average) }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-[var(--ui-border-accented)]">
              <td class="py-2 font-semibold text-[var(--ui-text)]" colspan="2">
                Moyenne générale
              </td>
              <td class="py-2 text-right font-semibold text-[var(--ui-text)]">
                {{ overallDisplay }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>

    <!-- Assiduité -->
    <section class="print-avoid-break">
      <h3 class="text-sm font-semibold text-[var(--ui-text)] mb-3">Assiduité</h3>
      <dl class="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div>
          <dt class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
            Sessions
          </dt>
          <dd class="text-xl font-semibold tracking-tight text-[var(--ui-text)] mt-1">
            {{ snapshot.attendance.total }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
            Présences
          </dt>
          <dd class="text-xl font-semibold tracking-tight text-[var(--ui-text)] mt-1">
            {{ snapshot.attendance.present }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
            Absences
          </dt>
          <dd class="text-xl font-semibold tracking-tight text-[var(--ui-text)] mt-1">
            {{ snapshot.attendance.absent }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
            Retards
          </dt>
          <dd class="text-xl font-semibold tracking-tight text-[var(--ui-text)] mt-1">
            {{ snapshot.attendance.retard }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
            Taux
          </dt>
          <dd class="text-xl font-semibold tracking-tight text-[var(--ui-text)] mt-1">
            {{ rateDisplay }}
          </dd>
        </div>
      </dl>
    </section>

    <!-- Appréciation -->
    <section v-if="generalComment" class="print-avoid-break">
      <h3 class="text-sm font-semibold text-[var(--ui-text)] mb-2">
        Appréciation générale
      </h3>
      <p class="text-sm text-[var(--ui-text-toned)] whitespace-pre-line">
        {{ generalComment }}
      </p>
    </section>
  </div>
</template>
