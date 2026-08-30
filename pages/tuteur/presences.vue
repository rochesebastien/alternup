<script setup lang="ts">
import type { AttendanceStatus } from '~/shared/utils/enums'
import {
  DEFAULT_PRESENCE_KIND,
  formatDuration,
  minutesFromTime,
  presenceEntryTutorFormSchema,
  roundedNowTime,
  startOfWeekKey,
  timeFromMinutes,
  toDateKey,
  workedMinutes,
  MINUTES_IN_DAY,
  WORKDAY_MINUTES,
  type PresenceEntry,
  type PresenceKind
} from '~/shared/utils/presence-entries'

const { user } = useUserSession()
const toast = useToast()

// Apprenant suivi (sélecteur de la barre de navigation) : quand il est défini,
// la vue ne montre que ses journées et ses sessions.
const { focus, focusName, filterByFocus } = useLearnerFocus()

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

function readErrorMessage(err: unknown): string | null {
  const e = err as {
    statusMessage?: string
    data?: { statusMessage?: string; issues?: Array<{ message: string }> }
  }
  return e.data?.statusMessage || e.data?.issues?.[0]?.message || e.statusMessage || null
}

// --- Pointage journalier ------------------------------------------------------
const { data: entriesData, refresh: refreshEntries } = await useFetch<PresenceEntry[]>(
  '/api/presence-entries',
  { default: () => [], key: 'presence-entries' }
)
const entries = computed<PresenceEntry[]>(() => entriesData.value ?? [])

// Le jour courant est figé au rendu serveur puis réaligné sur le fuseau du
// navigateur à l'hydratation (même précaution que `now` plus bas).
const today = ref<string>(toDateKey(new Date()))
const weekStart = ref<string>(startOfWeekKey(new Date()))
const now = ref<number>(Date.now())

// --- Formulaire de pointage --------------------------------------------------
const dayForm = reactive<{
  studentId: string
  date: string
  startTime: string
  endTime: string
  kind: PresenceKind
}>({
  studentId: '',
  date: today.value,
  startTime: '09:00',
  endTime: '17:00',
  kind: DEFAULT_PRESENCE_KIND
})

// Le fuseau du serveur n'est pas forcément celui du navigateur : on réaligne le
// jour courant (et le formulaire, tant qu'il n'a pas été ouvert) à l'hydratation.
onMounted(() => {
  const current = new Date()
  today.value = toDateKey(current)
  weekStart.value = startOfWeekKey(current)
  now.value = current.getTime()
  dayForm.date = today.value
})

const formOpen = ref<boolean>(false)
const formPending = ref<boolean>(false)
const formError = ref<string | null>(null)
const editingId = ref<string | null>(null)

const formMinutes = computed<number | null>(() => {
  const start = minutesFromTime(dayForm.startTime)
  const end = minutesFromTime(dayForm.endTime)
  return end > start ? end - start : null
})

function openCheckIn(): void {
  editingId.value = null
  // Le tuteur pointe le plus souvent pour l'apprenant qu'il suit déjà.
  dayForm.studentId = focus.value?.id ?? ''
  dayForm.date = today.value
  // « Je suis arrivé à… » : l'heure courante est le point de départ le plus
  // probable, l'utilisateur n'a plus qu'à corriger. Le départ est proposé une
  // journée de travail plus tard — jamais avant l'arrivée, sinon le formulaire
  // s'ouvrirait déjà en erreur.
  dayForm.startTime = roundedNowTime(new Date())
  dayForm.endTime = timeFromMinutes(
    Math.min(minutesFromTime(dayForm.startTime) + WORKDAY_MINUTES, MINUTES_IN_DAY - 1)
  )
  dayForm.kind = DEFAULT_PRESENCE_KIND
  formError.value = null
  formOpen.value = true
}

function openEdit(entry: PresenceEntry): void {
  editingId.value = entry.id
  dayForm.studentId = entry.studentId
  dayForm.date = entry.date
  dayForm.startTime = entry.startTime
  dayForm.endTime = entry.endTime
  dayForm.kind = entry.kind
  formError.value = null
  formOpen.value = true
}

async function submitDay(): Promise<void> {
  formPending.value = true
  formError.value = null
  try {
    await $fetch('/api/presence-entries', {
      method: 'POST',
      body: {
        studentId: dayForm.studentId || undefined,
        date: dayForm.date,
        startTime: dayForm.startTime,
        endTime: dayForm.endTime,
        kind: dayForm.kind
      }
    })
    formOpen.value = false
    editingId.value = null
    await refreshEntries()
    toast.add({ title: 'Journée pointée', color: 'success' })
  } catch (err: unknown) {
    formError.value = readErrorMessage(err) ?? 'Impossible d\'enregistrer ce pointage.'
  } finally {
    formPending.value = false
  }
}

// --- Suppression d'un pointage ----------------------------------------------
const removeTarget = ref<PresenceEntry | null>(null)
const removeOpen = ref<boolean>(false)
const removePending = ref<boolean>(false)

function askRemove(entry: PresenceEntry): void {
  removeTarget.value = entry
  removeOpen.value = true
}

async function confirmRemove(): Promise<void> {
  if (!removeTarget.value) return
  removePending.value = true
  try {
    await $fetch(`/api/presence-entries/${removeTarget.value.id}`, { method: 'DELETE' })
    removeOpen.value = false
    removeTarget.value = null
    await refreshEntries()
    toast.add({ title: 'Pointage supprimé', color: 'success' })
  } catch (err: unknown) {
    toast.add({
      title: readErrorMessage(err) ?? 'Impossible de supprimer ce pointage.',
      color: 'error'
    })
  } finally {
    removePending.value = false
  }
}

// --- Sessions du réseau -------------------------------------------------------
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
  default: () => []
})

const { data: learners } = await useFetch<TutorPerson[]>(
  () => `/api/tutors/${user.value?.id ?? '_'}/learners`,
  { default: () => [] }
)

const learnerItems = computed<Array<{ label: string, value: string }>>(() =>
  (learners.value ?? []).map((l) => ({ label: `${l.firstName} ${l.lastName}`, value: l.id }))
)

// Journées visibles par le tuteur : tout son réseau, ou le seul apprenant suivi.
const visibleEntries = computed<PresenceEntry[]>(() =>
  filterByFocus(entries.value, (e) => e.studentId)
)

const networkWeekMinutes = computed<number>(() =>
  workedMinutes(visibleEntries.value.filter((e) => e.date >= weekStart.value))
)

// --- Historique d'un pointage -------------------------------------------------
const historyTarget = ref<PresenceEntry | null>(null)
const historyOpen = ref<boolean>(false)

function openHistory(entry: PresenceEntry): void {
  historyTarget.value = entry
  historyOpen.value = true
}

const visibleSessions = computed<TutorSession[]>(() =>
  filterByFocus(tutorSessions.value ?? [], (s) => s.student?.id)
)

const pastSessions = computed<TutorSession[]>(() =>
  visibleSessions.value.filter((s) => new Date(s.startTime).getTime() <= now.value)
)

const upcomingSessions = computed<TutorSession[]>(() =>
  visibleSessions.value
    .filter((s) => new Date(s.startTime).getTime() > now.value)
    .slice()
    .reverse()
)
</script>

<template>
  <div class="w-full px-6 py-10 space-y-6">
    <PageHeader
      title="Présences"
      subtitle="Pointez l'assiduité de vos sessions et les journées de vos apprenants."
    >
      <template #actions>
        <UButton
          color="neutral"
          icon="i-lucide-clock"
          label="Pointer une journée"
          :disabled="learnerItems.length === 0"
          @click="openCheckIn"
        />
      </template>
    </PageHeader>

    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard
        label="Heures cette semaine"
        :value="formatDuration(networkWeekMinutes)"
        :hint="focusName ? `${focusName}, depuis lundi` : 'Tous les apprenants, depuis lundi'"
        icon="i-lucide-hourglass"
      />
      <StatCard
        label="Journées pointées"
        :value="visibleEntries.length"
        :hint="focusName ?? 'Toutes personnes'"
        icon="i-lucide-calendar-check"
      />
      <StatCard
        label="Sessions à pointer"
        :value="pastSessions.filter((s) => !s.attendance).length"
        icon="i-lucide-clipboard-check"
      />
      <StatCard label="Sessions à venir" :value="upcomingSessions.length" icon="i-lucide-calendar-clock" />
    </div>

    <!-- Journées déclarées par les alternants / stagiaires -->
    <section class="space-y-3">
      <h2 class="text-base font-semibold text-[var(--ui-text)]">Journées pointées</h2>
      <div
        v-if="visibleEntries.length === 0"
        class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
      >
        {{ focusName ? `Aucune journée pointée pour ${focusName}.` : "Aucune journée pointée pour l'instant." }}
      </div>
      <PresenceEntryCard
        v-for="entry in visibleEntries"
        :key="entry.id"
        :entry="entry"
        show-student
        show-history
        @edit="openEdit"
        @remove="askRemove"
        @history="openHistory"
      />
    </section>

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

    <!-- Pointer une journée pour un apprenant -->
    <UModal
      v-model:open="formOpen"
      :title="editingId ? 'Modifier un pointage' : 'Pointer une journée'"
    >
      <template #body>
        <UForm
          :state="dayForm"
          :schema="presenceEntryTutorFormSchema"
          :validate-on="['blur', 'change']"
          class="space-y-4"
          @submit="submitDay"
        >
          <UFormField label="Personne" name="studentId" required>
            <USelectMenu
              v-model="dayForm.studentId"
              value-key="value"
              :items="learnerItems"
              :disabled="!!editingId"
              placeholder="Sélectionner une personne"
              class="w-full"
            />
          </UFormField>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UFormField label="Jour" name="date" required>
              <UInput v-model="dayForm.date" type="date" class="w-full" />
            </UFormField>
            <UFormField label="Arrivée" name="startTime" required>
              <UInput v-model="dayForm.startTime" type="time" class="w-full" />
            </UFormField>
            <UFormField label="Départ" name="endTime" required>
              <UInput v-model="dayForm.endTime" type="time" class="w-full" />
            </UFormField>
          </div>

          <UFormField label="Type de journée" name="kind" required>
            <PresenceKindPicker v-model="dayForm.kind" />
          </UFormField>

          <p v-if="formMinutes" class="text-sm text-[var(--ui-text-muted)]">
            Journée de
            <span class="text-[var(--ui-text)] font-medium">{{ formatDuration(formMinutes) }}</span>
          </p>

          <UAlert
            v-if="formError"
            color="error"
            variant="soft"
            icon="i-lucide-triangle-alert"
            :title="formError"
          />

          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" label="Annuler" @click="formOpen = false" />
            <UButton
              type="submit"
              color="neutral"
              icon="i-lucide-check"
              :label="editingId ? 'Mettre à jour' : 'Pointer'"
              :loading="formPending"
            />
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Confirmation de suppression -->
    <UModal v-model:open="removeOpen" title="Supprimer ce pointage ?">
      <template #body>
        <p class="text-sm text-[var(--ui-text-muted)]">
          La journée déclarée sera définitivement retirée du suivi.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" label="Annuler" @click="removeOpen = false" />
          <UButton
            color="error"
            icon="i-lucide-trash-2"
            label="Supprimer"
            :loading="removePending"
            @click="confirmRemove"
          />
        </div>
      </template>
    </UModal>

    <!-- Historique d'un pointage -->
    <PresenceHistoryDialog v-model:open="historyOpen" :entry="historyTarget" />
  </div>
</template>
