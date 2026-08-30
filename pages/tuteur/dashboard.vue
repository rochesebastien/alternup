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

interface RecentUpdate {
  id: string
  body: string
  status: string | null
  createdAt: string
  author: {
    firstName: string
    lastName: string
    role: string
  }
  project: string
  student: Person
}

interface UpcomingSession {
  id: string
  title: string
  startTime: string
  student: Person | null
}

interface TutorSummary {
  role: 'Tutor'
  stats: Stat[]
  avgGrade: number | null
  gradeTrend: TrendPoint[]
  missionsByStatus: MissionStatus[]
  recentUpdates: RecentUpdate[]
  upcomingSessions: UpcomingSession[]
}

interface RiskEntry {
  student: { id: string; firstName: string; lastName: string }
  score: number
  level: 'ok' | 'vigilance' | 'alerte'
  reasons: string[]
}

const { data: summary } = await useFetch<TutorSummary>('/api/dashboard/summary')

// Alertes de décrochage — réservé au tuteur.
const { data: riskEntries } = await useFetch<RiskEntry[]>('/api/dashboard/risk', {
  default: () => [],
})

const atRisk = computed<RiskEntry[]>(() =>
  (riskEntries.value ?? []).filter((entry) => entry.level !== 'ok'),
)

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

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value))
}

function fullName(person: Person): string {
  return `${person.firstName} ${person.lastName}`
}
</script>

<template>
  <div
    v-if="summary"
    class="w-full px-6 py-10 space-y-6"
  >
    <PageHeader
      title="Tableau de bord"
      subtitle="Vue d'ensemble de vos alternants et stagiaires."
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
      <div class="flex items-start justify-between gap-4 mb-4">
        <h2 class="text-sm font-semibold text-[var(--ui-text)]">
          Alternants à suivre
        </h2>
        <span class="text-xs text-[var(--ui-text-muted)]">
          Signaux de décrochage sur 30 jours
        </span>
      </div>

      <ul
        v-if="atRisk.length"
        class="divide-y divide-[var(--ui-border)]"
      >
        <li
          v-for="entry in atRisk"
          :key="entry.student.id"
          class="py-3 first:pt-0 last:pb-0"
        >
          <div class="flex items-center justify-between gap-3">
            <NuxtLink
              :to="`/tuteur/alternants/${entry.student.id}`"
              class="font-medium text-[var(--ui-text)] hover:underline underline-offset-4"
            >
              {{ fullName(entry.student) }}
            </NuxtLink>
            <RiskBadge
              :level="entry.level"
              :score="entry.score"
            />
          </div>
          <ul class="mt-2 space-y-1">
            <li
              v-for="(reason, index) in entry.reasons"
              :key="index"
              class="flex gap-2 text-sm text-[var(--ui-text-muted)]"
            >
              <UIcon
                name="i-lucide-dot"
                class="mt-0.5 shrink-0 size-4"
              />
              <span>{{ reason }}</span>
            </li>
          </ul>
        </li>
      </ul>
      <div
        v-else
        class="rounded-md border border-dashed border-[var(--ui-border)] p-6 text-center text-sm text-[var(--ui-text-muted)]"
      >
        Aucun signal de décrochage : toutes les personnes sous votre responsabilité sont sur les rails.
      </div>
    </div>

    <div class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5">
      <h2 class="text-sm font-semibold text-[var(--ui-text)] mb-4">
        Derniers retours
      </h2>
      <UpdateTimeline
        :items="summary.recentUpdates.map((u) => ({ ...u, context: u.project + ' · ' + u.student.firstName + ' ' + u.student.lastName }))"
        empty-text="Aucun retour récent."
      />
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
          <span class="text-sm text-[var(--ui-text-muted)]">
            {{ formatDateTime(s.startTime) }}<template v-if="s.student"> · {{ fullName(s.student) }}</template>
          </span>
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
