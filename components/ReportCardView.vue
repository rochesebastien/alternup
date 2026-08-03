<script setup lang="ts">
interface SnapshotCourse {
  title: string
  average: number
  count: number
}

interface SnapshotAttendance {
  total: number
  present: number
  absent: number
  retard: number
  excuse: number
  rate: number | null
}

interface Snapshot {
  courses: SnapshotCourse[]
  overallAverage: number | null
  attendance: SnapshotAttendance
}

const props = defineProps<{
  snapshot: Snapshot
  generalComment?: string | null
  periodLabel?: string
}>()

const overallDisplay = computed<string>(() =>
  props.snapshot.overallAverage != null
    ? `${props.snapshot.overallAverage}/20`
    : '-'
)

const rateDisplay = computed<string>(() =>
  props.snapshot.attendance.rate != null
    ? `${props.snapshot.attendance.rate}%`
    : '-'
)

const courseBars = computed<Array<{ label: string; value: number }>>(() =>
  props.snapshot.courses.map((c: SnapshotCourse) => ({
    label: c.title,
    value: c.average
  }))
)
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between gap-4 flex-wrap">
      <div class="min-w-0">
        <p
          v-if="periodLabel"
          class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide"
        >
          {{ periodLabel }}
        </p>
        <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
          Moyenne générale
        </p>
        <p class="text-2xl font-semibold tracking-tight text-[var(--ui-text)] mt-1">
          {{ overallDisplay }}
        </p>
      </div>
    </div>

    <div>
      <p class="text-base font-semibold text-[var(--ui-text)] mb-3">
        Moyennes par cours
      </p>
      <div
        v-if="snapshot.courses.length === 0"
        class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-8 text-center"
      >
        Aucune note enregistrée sur la période.
      </div>
      <BarChart v-else :data="courseBars" />
    </div>

    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div>
        <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
          Présences
        </p>
        <p class="text-2xl font-semibold tracking-tight text-[var(--ui-text)] mt-1">
          {{ snapshot.attendance.present }}
        </p>
      </div>
      <div>
        <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
          Absences
        </p>
        <p class="text-2xl font-semibold tracking-tight text-[var(--ui-text)] mt-1">
          {{ snapshot.attendance.absent }}
        </p>
      </div>
      <div>
        <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
          Retards
        </p>
        <p class="text-2xl font-semibold tracking-tight text-[var(--ui-text)] mt-1">
          {{ snapshot.attendance.retard }}
        </p>
      </div>
      <div>
        <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
          Taux
        </p>
        <p class="text-2xl font-semibold tracking-tight text-[var(--ui-text)] mt-1">
          {{ rateDisplay }}
        </p>
      </div>
    </div>

    <div
      v-if="generalComment"
      class="rounded-lg bg-[var(--ui-bg-muted)] p-4"
    >
      <p class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
        Appréciation
      </p>
      <p class="text-sm text-[var(--ui-text)] mt-1 whitespace-pre-line">
        {{ generalComment }}
      </p>
    </div>
  </div>
</template>
