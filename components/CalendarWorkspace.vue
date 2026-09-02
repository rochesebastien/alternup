<template>
  <div class="w-full px-6 py-10 space-y-6">
    <PageHeader
      title="Calendrier"
      :subtitle="isTutor ? 'Sessions et rendez-vous avec vos alternants.' : 'Vos cours et rendez-vous à venir.'"
    >
      <template v-if="isTutor" #actions>
        <UButton color="neutral" icon="i-lucide-plus" @click="openCreate">
          Nouvel événement
        </UButton>
      </template>
    </PageHeader>

    <UAlert
      v-if="loadError"
      color="error"
      variant="soft"
      title="Erreur de chargement"
      :description="loadError.message"
    />

    <div class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] overflow-hidden flex flex-col h-[calc(100vh-13rem)] min-h-[560px]">
      <div class="px-4 pt-4 pb-3 border-b border-[var(--ui-border)]">
        <CalendarToolbar />
      </div>
      <CalendarMonthView v-if="view === 'month'" />
      <CalendarWeekView v-else />
    </div>

    <!-- Détail / édition de note (session de cours) -->
    <UModal v-model:open="noteModalOpen" :title="noteModalTitle">
      <template #body>
        <div v-if="selectedEvent" class="space-y-4">
          <p class="text-sm text-[var(--ui-text-muted)]">
            {{ formatDate(selectedEvent.startTime) }} ·
            {{ formatTimeRange(selectedEvent.startTime, selectedEvent.endTime) }}
          </p>

          <UForm
            v-if="selectedEvent.courseAssignmentId"
            :state="noteState"
            :schema="noteFormSchema"
            class="space-y-4"
            @submit="onNoteSubmit"
          >
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <UFormField label="Note /20" name="grade">
                <UInput
                  v-model="noteState.grade"
                  type="number"
                  min="0"
                  max="20"
                  step="0.25"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Notions vues" name="notions" class="sm:col-span-2">
                <UInput
                  v-model="noteState.notions"
                  placeholder="Algèbre, Géométrie, …"
                  class="w-full"
                />
              </UFormField>
            </div>

            <UFormField label="Commentaire" name="comment">
              <UTextarea v-model="noteState.comment" :rows="3" class="w-full" />
            </UFormField>

            <UAlert
              v-if="noteError"
              color="error"
              variant="soft"
              :title="noteError"
            />

            <div class="flex justify-end gap-2 pt-2">
              <UButton color="neutral" variant="ghost" @click="noteModalOpen = false">
                Fermer
              </UButton>
              <UButton type="submit" color="neutral" :loading="notePending">
                Enregistrer
              </UButton>
            </div>
          </UForm>

          <div v-else>
            <p class="text-sm text-[var(--ui-text-muted)]">{{ selectedEvent.title }}</p>
            <p v-if="selectedEvent.student" class="text-sm text-[var(--ui-text-muted)] mt-2">
              Avec {{ selectedEvent.student.firstName }} {{ selectedEvent.student.lastName }}
            </p>
            <UBadge
              v-if="selectedEvent.presenceRequired"
              color="error"
              variant="soft"
              class="mt-2"
            >
              Présence obligatoire
            </UBadge>
            <div v-if="isTutor" class="flex justify-end gap-2 mt-6">
              <UButton color="neutral" variant="ghost" @click="noteModalOpen = false">
                Fermer
              </UButton>
              <UButton
                color="error"
                variant="soft"
                :loading="deletePending"
                @click="confirmDelete"
              >
                Supprimer
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Détail d'un pointage (lecture seule : géré depuis /presences) -->
    <UModal v-model:open="presenceModalOpen" title="Pointage">
      <template #body>
        <div v-if="selectedPresence" class="space-y-3">
          <p v-if="selectedPresence.student" class="font-medium">
            {{ selectedPresence.student.firstName }} {{ selectedPresence.student.lastName }}
          </p>
          <p class="text-sm text-[var(--ui-text-muted)]">
            {{ formatPresenceDate(selectedPresence.date) }} ·
            {{ selectedPresence.startTime }} – {{ selectedPresence.endTime }}
            ({{ formatDuration(selectedPresence.minutes) }})
          </p>
          <UBadge color="primary" variant="soft">
            {{ presenceKindLabel(selectedPresence.kind) }}
          </UBadge>
          <div class="flex justify-end gap-2 pt-2">
            <UButton color="neutral" variant="ghost" @click="presenceModalOpen = false">
              Fermer
            </UButton>
            <UButton color="neutral" :to="`${space}/presences`">
              Voir les présences
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Création (tuteur) -->
    <UModal v-if="isTutor" v-model:open="createOpen" title="Nouvel événement">
      <template #body>
        <UForm
          :state="createState"
          :schema="createSchema"
          class="space-y-4"
          @submit="onCreateSubmit"
        >
          <UFormField label="Titre" name="title" required>
            <UInput v-model="createState.title" class="w-full" />
          </UFormField>

          <UFormField
            label="Alternant ou stagiaire"
            name="studentId"
            help="Optionnel : laissez vide pour un événement libre."
          >
            <USelect
              v-model="createState.studentId"
              :items="learnerSelectItems"
              value-key="value"
              placeholder="Aucun"
              class="w-full"
            />
          </UFormField>

          <UFormField v-if="selectedStudentId" name="presenceRequired">
            <UCheckbox
              v-model="createState.presenceRequired"
              label="Présence obligatoire"
              description="La présence de l'alternant ou du stagiaire est attendue."
            />
          </UFormField>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormField label="Début" name="startTime" required>
              <UInput
                v-model="createState.startTime"
                type="datetime-local"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Fin" name="endTime" required>
              <UInput
                v-model="createState.endTime"
                type="datetime-local"
                class="w-full"
              />
            </UFormField>
          </div>

          <UAlert
            v-if="createError"
            color="error"
            variant="soft"
            :title="createError"
          />

          <div class="flex justify-end gap-2 pt-2">
            <UButton color="neutral" variant="ghost" @click="createOpen = false">
              Annuler
            </UButton>
            <UButton type="submit" color="neutral" :loading="createPending">
              Créer
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { addHours, format } from 'date-fns'
import { Role } from '~/shared/utils/enums'
import {
  presenceEntriesToDisplayEvents,
  toDisplayEvents,
  type ApiCalendarEvent,
  type CalendarDisplayEvent
} from '~/shared/utils/calendar-display'
import {
  findNoteForSession,
  notionsToString,
  parseNotions,
  type NoteByAssignmentRef
} from '~/shared/utils/course-notes'
import { formatDuration, presenceKindLabel, type PresenceEntry } from '~/shared/utils/presence-entries'
import { spacePrefixOf } from '~/shared/utils/auth-redirect'

/**
 * Calendrier maison (adapté du template Nuxt UI « calendar »), partagé par
 * /tuteur/calendar et /alternant/calendar : le rendu est quasi identique
 * entre rôles (ADR-0001 §2), seuls la création et le glisser-déposer restent
 * réservés au tuteur (`canEdit` du contexte, doublé par les 403 de l'API).
 */

const route = useRoute()
const space = computed<string>(() => spacePrefixOf(route.path) ?? '/alternant')

const toast = useToast()
const { user } = useUserSession()
const isTutor = computed(() => user.value?.role === Role.Tutor)
// Détermine le préfixe du titre des pointages dans le calendrier (voir
// `presenceEntriesToDisplayEvents`) : chaîne vide tant que la session n'est pas
// résolue, aucun pointage ne peut alors correspondre à « le sien ».
const viewerId = computed(() => user.value?.id ?? '')
// Forwarde les cookies de session lors du rendu serveur (sinon 401 sur les $fetch SSR)
const requestFetch = useRequestFetch()

interface CourseNote extends NoteByAssignmentRef {
  assignment?: { course?: { id: string; title: string } }
}

// `/api/calendar-events` filtre selon le rôle (tutorId pour un tuteur,
// studentId sinon) — contrairement à `/api/users/[id]/calendar` qui ne cherche
// que par studentId et renvoyait donc toujours une liste vide aux tuteurs.
const {
  data: calendarEvents,
  error: loadError,
  refresh: refreshEvents
} = await useFetch<ApiCalendarEvent[]>('/api/calendar-events', { default: () => [] })

const { data: notes, refresh: refreshNotes } = await useFetch<CourseNote[]>(
  '/api/course-notes',
  { default: () => [] }
)

// Pointages journaliers : affichés en lecture seule dans le calendrier (voir
// `presenceEntriesToDisplayEvents`). Un apprenant ne voit que les siens, un
// tuteur ceux de son réseau — filtrage déjà fait côté API.
const { data: presenceEntries } = await useFetch<PresenceEntry[]>('/api/presence-entries', {
  default: () => []
})

const learners = ref<Array<{ id: string; firstName: string; lastName: string; email: string }>>([])
watch(
  () => (isTutor.value ? user.value?.id : null),
  async (id) => {
    if (!id) return
    learners.value = await requestFetch<typeof learners.value>(
      `/api/tutors/${id}/learners`
    )
  },
  { immediate: true }
)
const learnerItems = computed(() =>
  learners.value.map((l) => ({
    label: `${l.firstName} ${l.lastName} (${l.email})`,
    value: l.id
  }))
)
// « Aucun » en tête : l'alternant est optionnel à la création d'un événement.
// Valeur sentinelle non vide : Reka (USelect) rejette les items à valeur ''.
const NO_STUDENT = 'none'
const learnerSelectItems = computed(() => [
  { label: 'Aucun', value: NO_STUDENT },
  ...learnerItems.value
])
/** Alternant réellement sélectionné (ni vide, ni « Aucun »). */
const selectedStudentId = computed(() =>
  createState.studentId && createState.studentId !== NO_STUDENT
    ? createState.studentId
    : null
)

/* ─────────────────────────── Contexte calendrier ─────────────────────────── */

const { view, date, range, title, setView, goTo, prev, next, today } = useCalendarView()

/** Flux fusionné consommé par les vues : événements de calendrier + pointages. */
const events = computed<CalendarDisplayEvent[]>(() =>
  [
    ...toDisplayEvents(calendarEvents.value ?? []),
    ...presenceEntriesToDisplayEvents(presenceEntries.value ?? [], viewerId.value)
  ]
)
const eventsForDay = useEventsForDay(events)

/** Fantôme de création en cours de dessin (glissé sur la grille horaire). */
const draft = shallowRef<CalendarDraft | null>(null)

/** `canEdit` et l'événement n'est pas un pointage : jamais déplaçable, même pour le tuteur. */
function isEditable(event: CalendarDisplayEvent): boolean {
  return isTutor.value && event.calendarId !== 'presence'
}

function onEventClick(event: CalendarDisplayEvent): void {
  if (event.calendarId === 'presence') {
    openPresenceDetail(event.rawEvent as PresenceEntry)
  } else {
    openEventDetail(event.rawEvent as ApiCalendarEvent)
  }
}

/**
 * Persiste un déplacement/redimensionnement (grille horaire). `false` fait
 * remettre le bloc à sa place par la vue — un rafraîchissement des données
 * suffit puisque rien n'est retenu localement pendant le geste.
 */
async function onEventMove(event: CalendarDisplayEvent, start: Date, end: Date): Promise<boolean> {
  // Un pointage n'a pas de route PUT dédiée : `isEditable` empêche déjà le
  // geste de démarrer, ce refus est la garde de dernier recours.
  if (event.calendarId === 'presence') return false
  const startTime = start.toISOString()
  const endTime = end.toISOString()
  try {
    await $fetch(`/api/calendar-events/${event.id}`, {
      method: 'PUT',
      body: { startTime, endTime }
    })
    // Aligne la copie locale (modales et relecture des vues) sans relancer un
    // rafraîchissement complet. `data` de useFetch est un shallowRef (Nuxt 4,
    // `deep: false`) : une mutation en place de l'objet ne notifie personne et
    // le bloc restait à son ancienne place jusqu'au rechargement — on remplace
    // donc le tableau pour que les computed (bucketByDay, layoutDay) recalculent.
    calendarEvents.value = (calendarEvents.value ?? []).map((e) =>
      e.id === event.id ? { ...e, startTime, endTime } : e
    )
    toast.add({ title: 'Événement déplacé', color: 'success' })
    return true
  } catch (err: unknown) {
    toast.add({
      title: readErrorMessage(err) ?? 'Impossible de déplacer l\'événement.',
      color: 'error'
    })
    await refreshEvents()
    return false
  }
}

/** Format attendu par un champ `datetime-local`, en heure locale. */
function toDateTimeLocal(value: Date): string {
  return format(value, "yyyy-MM-dd'T'HH:mm")
}

/** Ouvre la modale de création, pré-remplie avec la plage dessinée/cliquée. */
function onCreateRequest(start: Date, end: Date): void {
  resetCreateState()
  createState.startTime = toDateTimeLocal(start)
  createState.endTime = toDateTimeLocal(end)
  createOpen.value = true
}

provideCalendarContext({
  view,
  date,
  range,
  title,
  setView,
  goTo,
  prev,
  next,
  today,
  events,
  eventsForDay,
  canEdit: isTutor,
  isEditable,
  draft,
  onEventClick,
  onEventMove,
  onCreateRequest
})

/* ─────────────────────────── Modales (inchangées) ─────────────────────────── */

const selectedEvent = ref<ApiCalendarEvent | null>(null)
const noteModalOpen = ref(false)

const noteFormSchema = z.object({
  grade: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (!v || v.trim() === '') return true
        const n = Number(v)
        return !Number.isNaN(n) && n >= 0 && n <= 20
      },
      { message: 'Doit être un nombre entre 0 et 20' }
    ),
  comment: z.string().trim().max(5000).optional(),
  notions: z.string().trim().max(2000).optional()
})

const noteState = reactive({ grade: '', comment: '', notions: '' })
const notePending = ref(false)
const noteError = ref<string | null>(null)
const deletePending = ref(false)

const noteModalTitle = computed(() => {
  if (!selectedEvent.value) return ''
  return selectedEvent.value.courseAssignment?.course.title ?? selectedEvent.value.title
})

function openEventDetail(raw: ApiCalendarEvent) {
  selectedEvent.value = raw
  noteError.value = null

  if (raw.courseAssignmentId) {
    const existing = findNoteForSession(
      (notes.value ?? []) as NoteByAssignmentRef[],
      raw.courseAssignmentId,
      raw.startTime
    )
    noteState.grade = existing?.grade != null ? String(existing.grade) : ''
    noteState.comment = existing?.comment ?? ''
    noteState.notions = existing ? notionsToString(existing.notionsCovered) : ''
  }
  noteModalOpen.value = true
}

async function onNoteSubmit() {
  if (!selectedEvent.value) return
  notePending.value = true
  noteError.value = null
  const trimmedGrade = noteState.grade.trim()
  const body = {
    grade: trimmedGrade === '' ? null : Number(trimmedGrade),
    comment: noteState.comment.trim() === '' ? null : noteState.comment,
    notionsCovered: noteState.notions.trim() === '' ? null : parseNotions(noteState.notions)
  }
  try {
    await $fetch(`/api/events/${selectedEvent.value.id}/notes`, {
      method: 'POST',
      body
    })
    toast.add({ title: 'Note enregistrée', color: 'success' })
    noteModalOpen.value = false
    await Promise.all([refreshNotes(), refreshEvents()])
  } catch (err: unknown) {
    noteError.value = readErrorMessage(err) ?? 'Impossible d\'enregistrer.'
  } finally {
    notePending.value = false
  }
}

async function confirmDelete() {
  if (!selectedEvent.value) return
  if (!window.confirm('Supprimer cet événement ?')) return
  deletePending.value = true
  try {
    await $fetch(`/api/calendar-events/${selectedEvent.value.id}`, { method: 'DELETE' })
    noteModalOpen.value = false
    toast.add({ title: 'Événement supprimé', color: 'success' })
    await refreshEvents()
  } catch (err: unknown) {
    noteError.value = readErrorMessage(err) ?? 'Impossible de supprimer.'
  } finally {
    deletePending.value = false
  }
}

/* ────────────────────── Détail d'un pointage (lecture seule) ────────────────────── */

const selectedPresence = ref<PresenceEntry | null>(null)
const presenceModalOpen = ref(false)

function openPresenceDetail(entry: PresenceEntry) {
  selectedPresence.value = entry
  presenceModalOpen.value = true
}

/** `date` ('AAAA-MM-JJ') → jour lisible en heure locale (jamais `new Date(dateKey)`, lu en UTC). */
function formatPresenceDate(dateKey: string): string {
  const parts = dateKey.split('-').map(Number)
  const year = parts[0] ?? 0
  const month = parts[1] ?? 1
  const day = parts[2] ?? 1
  return dateFormatter.format(new Date(year, month - 1, day))
}

const createOpen = ref(false)
const createSchema = z
  .object({
    title: z.string().trim().min(1, 'Titre requis').max(200),
    // Chaîne vide = aucun alternant : l'événement est « libre ».
    studentId: z.string(),
    presenceRequired: z.boolean(),
    startTime: z.string().min(1, 'Date requise'),
    endTime: z.string().min(1, 'Date requise')
  })
  .refine(
    (d) => {
      const s = new Date(d.startTime)
      const e = new Date(d.endTime)
      return !Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && e > s
    },
    { message: 'La fin doit être après le début', path: ['endTime'] }
  )

const createState = reactive({
  title: '',
  studentId: '',
  presenceRequired: false,
  startTime: '',
  endTime: ''
})
const createPending = ref(false)
const createError = ref<string | null>(null)

function resetCreateState() {
  createState.title = ''
  createState.studentId = ''
  createState.presenceRequired = false
  createState.startTime = ''
  createState.endTime = ''
  createError.value = null
}

// La présence obligatoire n'a de sens qu'avec un alternant sélectionné.
watch(selectedStudentId, (id) => {
  if (!id) createState.presenceRequired = false
})

/**
 * Bouton « Nouvel événement » du `PageHeader` : pré-remplit sur la prochaine
 * heure pleine (heure réelle actuelle, pas celle de `date`, qui n'est qu'un
 * repère de jour côté vue semaine/mois — souvent minuit) du jour affiché.
 */
function openCreate() {
  const now = new Date()
  const roundedUp = now.getMinutes() === 0 && now.getSeconds() === 0 && now.getMilliseconds() === 0
    ? now.getHours()
    : now.getHours() + 1
  const day = date.value
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), roundedUp, 0, 0, 0)
  onCreateRequest(start, addHours(start, 1))
}

async function onCreateSubmit() {
  createPending.value = true
  createError.value = null
  const createdOn = createState.startTime
  try {
    await $fetch('/api/calendar-events', {
      method: 'POST',
      body: {
        title: createState.title,
        studentId: selectedStudentId.value,
        presenceRequired: createState.presenceRequired,
        startTime: new Date(createState.startTime).toISOString(),
        endTime: new Date(createState.endTime).toISOString()
      }
    })
    createOpen.value = false
    toast.add({ title: 'Événement créé', color: 'success' })
    await refreshEvents()
    // L'événement peut tomber hors de la période affichée : on s'y déplace.
    goTo(new Date(createdOn))
  } catch (err: unknown) {
    createError.value = readErrorMessage(err) ?? 'Impossible de créer l\'événement.'
  } finally {
    createPending.value = false
  }
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric'
})
const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  hour: '2-digit',
  minute: '2-digit'
})
function formatDate(value: string): string {
  return dateFormatter.format(new Date(value))
}
function formatTimeRange(start: string, end: string): string {
  return `${timeFormatter.format(new Date(start))} – ${timeFormatter.format(new Date(end))}`
}

function readErrorMessage(err: unknown): string | null {
  const e = err as {
    statusMessage?: string
    data?: { statusMessage?: string; issues?: Array<{ message: string }> }
  }
  return e.data?.statusMessage || e.data?.issues?.[0]?.message || e.statusMessage || null
}
</script>
