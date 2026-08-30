<script setup lang="ts">
interface Stat {
  key: string
  label: string
  value: string | number
}

interface TrendPoint {
  label: string
  value: number | null
}

interface MissionStatus {
  status: string
  label: string
  count: number
}

interface Person {
  firstName: string
  lastName: string
}

interface RecentNote {
  id: string
  grade: number | null
  sessionDate: string
  course: string
}

interface UpcomingSession {
  id: string
  title: string
  startTime: string
  student: Person | null
}

interface LearnerSummary {
  role: 'Alternant' | 'Stagiaire'
  stats: Stat[]
  avgGrade: number | null
  gradeTrend: TrendPoint[]
  missionsByStatus: MissionStatus[]
  recentNotes: RecentNote[]
  upcomingSessions: UpcomingSession[]
}

const { data: summary } = await useFetch<LearnerSummary>('/api/dashboard/summary')

function iconFor(key: string): string {
  const map: Record<string, string> = {
    grade: 'i-lucide-graduation-cap',
    projects: 'i-lucide-folder',
    learners: 'i-lucide-users',
    active: 'i-lucide-list-checks',
    missions: 'i-lucide-list-checks',
    notes: 'i-lucide-clipboard-list',
    sessions: 'i-lucide-calendar',
  }
  return map[key] ?? 'i-lucide-activity'
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value))
}

function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value))
}
</script>

<template>
  <div
    v-if="summary"
    class="w-full px-6 py-10 space-y-6"
  >
    <PageHeader
      title="Tableau de bord"
      subtitle="Votre progression et vos échéances."
    />

    <!-- KPI -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        v-for="s in summary.stats"
        :key="s.key"
        :label="s.label"
        :value="s.value"
        :icon="iconFor(s.key)"
      />
    </div>

    <!-- Notes + missions -->
    <div class="grid gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5">
        <div class="flex items-start justify-between mb-4">
          <h2 class="text-sm font-semibold text-[var(--ui-text)]">
            Évolution des notes
          </h2>
          <span class="text-2xl font-semibold tracking-tight text-[var(--ui-text)]">
            {{ summary.avgGrade != null ? summary.avgGrade + '/20' : '-' }}
          </span>
        </div>
        <TrendChart
          :data="summary.gradeTrend"
          suffix="/20"
        />
      </div>

      <div class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5">
        <h2 class="text-sm font-semibold text-[var(--ui-text)] mb-4">
          Missions par statut
        </h2>
        <BarChart :data="summary.missionsByStatus.map((m) => ({ label: m.label, value: m.count }))" />
      </div>
    </div>

    <div class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5">
      <h2 class="text-sm font-semibold text-[var(--ui-text)] mb-4">
        Dernières notes
      </h2>
      <ul
        v-if="summary.recentNotes.length"
        class="space-y-3"
      >
        <li
          v-for="n in summary.recentNotes"
          :key="n.id"
          class="flex items-start justify-between gap-4"
        >
          <div class="flex flex-col">
            <span class="font-medium text-[var(--ui-text)]">{{ n.course }}</span>
            <span class="text-sm text-[var(--ui-text-muted)]">{{ formatDate(n.sessionDate) }}</span>
          </div>
          <span class="text-sm font-medium text-[var(--ui-text)] whitespace-nowrap">
            {{ n.grade != null ? n.grade + '/20' : '-' }}
          </span>
        </li>
      </ul>
      <div
        v-else
        class="rounded-md border border-dashed border-[var(--ui-border)] p-6 text-center text-sm text-[var(--ui-text-muted)]"
      >
        Aucune note récente.
      </div>
    </div>

    <div class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5">
      <h2 class="text-sm font-semibold text-[var(--ui-text)] mb-4">
        Prochaines sessions
      </h2>
      <ul
        v-if="summary.upcomingSessions.length"
        class="space-y-3"
      >
        <li
          v-for="s in summary.upcomingSessions"
          :key="s.id"
          class="flex flex-col"
        >
          <span class="font-medium text-[var(--ui-text)]">{{ s.title }}</span>
          <span class="text-sm text-[var(--ui-text-muted)]">{{ formatDateTime(s.startTime) }}</span>
        </li>
      </ul>
      <div
        v-else
        class="rounded-md border border-dashed border-[var(--ui-border)] p-6 text-center text-sm text-[var(--ui-text-muted)]"
      >
        Aucune session à venir.
      </div>
    </div>
  </div>
</template>
