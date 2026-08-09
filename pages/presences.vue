<script setup lang="ts">
import type { AttendanceStatus } from '~/shared/utils/enums'
import { Role } from '~/shared/utils/enums'

definePageMeta({
  // Authentifié seulement — comportement selon le rôle
})

const { user } = useUserSession()
const isTutor = computed<boolean>(() => user.value?.role === Role.Tutor)

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' })
const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit'
})

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value))
}

function formatTime(value: string): string {
  return timeFormatter.format(new Date(value))
}

// --- Tuteur -----------------------------------------------------------------
interface TutorPerson {
  id: string
  firstName: string
  lastName: string
}

interface TutorAttendance {
  id: string
  eventId: string
  status: AttendanceStatus
  minutesLate: number | null
  justification: string | null
  recordedById: string
  recordedAt: string
}

interface TutorSession {
  id: string
  title: string
  startTime: string
  endTime: string
  student: TutorPerson
  attendance: TutorAttendance | null
}

const {
  data: tutorSessions,
  refresh: refreshTutor
} = await useFetch<TutorSession[]>('/api/attendance', {
  default: () => [],
  immediate: isTutor.value
})

const now = ref<number>(Date.now())
onMounted(() => {
  now.value = Date.now()
})

const pastSessions = computed<TutorSession[]>(() =>
  (tutorSessions.value ?? []).filter((s) => new Date(s.startTime).getTime() <= now.value)
)

const upcomingSessions = computed<TutorSession[]>(() =>
  (tutorSessions.value ?? [])
    .filter((s) => new Date(s.startTime).getTime() > now.value)
    .slice()
    .reverse()
)

// --- Alternant / Stagiaire --------------------------------------------------
interface LearnerItem {
  eventId: string
  title: string
  startTime: string
  status: AttendanceStatus | null
  minutesLate: number | null
}

interface LearnerSummary {
  total: number
  present: number
  absent: number
  retard: number
  excuse: number
  rate: number | null
}

interface LearnerAttendance {
  items: LearnerItem[]
  summary: LearnerSummary
}

const {
  data: learnerData
} = await useFetch<LearnerAttendance>(
  () => `/api/users/${user.value?.id ?? ''}/attendance`,
  {
    default: () => ({
      items: [],
      summary: { total: 0, present: 0, absent: 0, retard: 0, excuse: 0, rate: null }
    }),
    immediate: !isTutor.value && !!user.value?.id
  }
)

const learnerRate = computed<string>(() => {
  const rate = learnerData.value?.summary.rate
  return rate != null ? `${rate}%` : '-'
})
</script>

<template>
  <div class="w-full px-6 py-10 space-y-6">
    <!-- Vue Tuteur -->
    <template v-if="isTutor">
      <PageHeader
        title="Présences"
        subtitle="Pointez l'assiduité de vos sessions."
      />

      <section class="space-y-3">
        <h2 class="text-base font-semibold text-[var(--ui-text)]">Sessions passées</h2>
        <div
          v-if="pastSessions.length === 0"
          class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
        >
          Aucune session passée à pointer.
        </div>
        <div
          v-for="session in pastSessions"
          :key="session.id"
          class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5 space-y-3"
        >
          <div class="flex items-start justify-between gap-4 flex-wrap">
            <div class="min-w-0">
              <p class="text-base font-semibold text-[var(--ui-text)]">{{ session.title }}</p>
              <p class="text-sm text-[var(--ui-text-muted)] mt-1">
                {{ formatDate(session.startTime) }} · {{ formatTime(session.startTime) }}
              </p>
              <p class="text-sm text-[var(--ui-text-toned)] mt-0.5">
                {{ session.student.firstName }} {{ session.student.lastName }}
              </p>
            </div>
            <AttendanceBadge
              :status="session.attendance?.status ?? null"
              :minutes-late="session.attendance?.minutesLate ?? null"
            />
          </div>
          <AttendanceControl
            :event-id="session.id"
            :model-status="session.attendance?.status ?? null"
            :minutes-late="session.attendance?.minutesLate ?? null"
            @saved="refreshTutor"
          />
        </div>
      </section>

      <section class="space-y-3">
        <h2 class="text-base font-semibold text-[var(--ui-text)]">Sessions à venir</h2>
        <div
          v-if="upcomingSessions.length === 0"
          class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
        >
          Aucune session à venir.
        </div>
        <div
          v-for="session in upcomingSessions"
          :key="session.id"
          class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5 flex items-start justify-between gap-4 flex-wrap"
        >
          <div class="min-w-0">
            <p class="text-base font-semibold text-[var(--ui-text)]">{{ session.title }}</p>
            <p class="text-sm text-[var(--ui-text-muted)] mt-1">
              {{ formatDate(session.startTime) }} · {{ formatTime(session.startTime) }}
            </p>
            <p class="text-sm text-[var(--ui-text-toned)] mt-0.5">
              {{ session.student.firstName }} {{ session.student.lastName }}
            </p>
          </div>
          <UBadge color="neutral" variant="subtle" class="font-normal">
            Pointage indisponible
          </UBadge>
        </div>
      </section>
    </template>

    <!-- Vue Alternant / Stagiaire -->
    <template v-else>
      <PageHeader
        title="Présences"
        subtitle="Votre assiduité aux sessions."
      />

      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Taux de présence" :value="learnerRate" />
        <StatCard label="Présences" :value="learnerData?.summary.present ?? 0" />
        <StatCard label="Absences" :value="learnerData?.summary.absent ?? 0" />
        <StatCard label="Retards" :value="learnerData?.summary.retard ?? 0" />
      </div>

      <section class="space-y-3">
        <h2 class="text-base font-semibold text-[var(--ui-text)]">Sessions</h2>
        <div
          v-if="(learnerData?.items.length ?? 0) === 0"
          class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
        >
          Aucune session enregistrée.
        </div>
        <div
          v-for="item in learnerData?.items ?? []"
          :key="item.eventId"
          class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5 flex items-start justify-between gap-4 flex-wrap"
        >
          <div class="min-w-0">
            <p class="text-base font-semibold text-[var(--ui-text)]">{{ item.title }}</p>
            <p class="text-sm text-[var(--ui-text-muted)] mt-1">
              {{ formatDate(item.startTime) }} · {{ formatTime(item.startTime) }}
            </p>
          </div>
          <AttendanceBadge :status="item.status" :minutes-late="item.minutesLate" />
        </div>
      </section>
    </template>
  </div>
</template>
