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

    <div class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-4">
      <ClientOnly>
        <div class="sx-calendar-shell">
          <ScheduleXCalendar v-if="calendarApp" :calendar-app="calendarApp" />
          <div v-else class="flex justify-center py-12">
            <UIcon name="i-lucide-loader-2" class="animate-spin h-6 w-6 text-[var(--ui-text-dimmed)]" />
          </div>
        </div>
        <template #fallback>
          <div class="flex justify-center py-12">
            <UIcon name="i-lucide-loader-2" class="animate-spin h-6 w-6 text-[var(--ui-text-dimmed)]" />
          </div>
        </template>
      </ClientOnly>
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
import { Role } from '~/shared/utils/enums'
import { ScheduleXCalendar } from '@schedule-x/vue'
import {
  createCalendar,
  viewDay,
  viewList,
  viewMonthGrid,
  viewWeek,
  type CalendarApp,
  type CalendarEvent,
  type CalendarType,
  type PluginBase
} from '@schedule-x/calendar'
import { createEventsServicePlugin } from '@schedule-x/events-service'
import { createCalendarControlsPlugin } from '@schedule-x/calendar-controls'
import { createCurrentTimePlugin } from '@schedule-x/current-time'
import { createDragAndDropPlugin } from '@schedule-x/drag-and-drop'
import { createResizePlugin } from '@schedule-x/resize'
import '@schedule-x/theme-shadcn/dist/index.css'
import {
  toDisplayEvents,
  type ApiCalendarEvent,
  type CalendarCategoryId
} from '~/shared/utils/calendar-display'
import {
  findNoteForSession,
  notionsToString,
  parseNotions,
  type NoteByAssignmentRef
} from '~/shared/utils/course-notes'

definePageMeta({
  // Authentifié seulement — pas de contrainte de rôle
})

const toast = useToast()
const colorMode = useColorMode()
const { user } = useUserSession()
const isTutor = computed(() => user.value?.role === Role.Tutor)
// Forwarde les cookies de session lors du rendu serveur (sinon 401 sur les $fetch SSR)
const requestFetch = useRequestFetch()

interface CourseNote extends NoteByAssignmentRef {
  assignment?: { course?: { id: string; title: string } }
}

// `/api/calendar-events` filtre selon le rôle (tutorId pour un tuteur,
// studentId sinon) — contrairement à `/api/users/[id]/calendar` qui ne cherche
// que par studentId et renvoyait donc toujours une liste vide aux tuteurs.
const {
  data: events,
  error: loadError,
  refresh: refreshEvents
} = await useFetch<ApiCalendarEvent[]>('/api/calendar-events', { default: () => [] })

const { data: notes, refresh: refreshNotes } = await useFetch<CourseNote[]>(
  '/api/course-notes',
  { default: () => [] }
)

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

/* ───────────────────────── Calendrier (Schedule-X) ───────────────────────── */

/** Lundi — l'énumération `WeekDay` de Schedule-X n'est pas exportée (1 = lundi). */
const MONDAY = 1
/** Première heure visible à l'ouverture de la grille semaine / jour. */
const FIRST_VISIBLE_HOUR = 7
/** Heure par défaut d'un événement créé depuis un clic sur une case « jour ». */
const DEFAULT_CREATE_HOUR = 9
/** Granularité du glisser-déposer et du redimensionnement, en minutes. */
const DRAG_INTERVAL_MINUTES = 15

/**
 * Une « calendar » Schedule-X par catégorie d'événement. Les couleurs sont
 * alignées sur la palette de l'app : vert pour les sessions de cours, jaune de
 * marque (#F1DE02) pour les visites, neutre pour le reste.
 */
const calendars: Record<CalendarCategoryId, CalendarType> = {
  session: {
    colorName: 'session',
    label: 'Session de cours',
    lightColors: { main: '#047857', container: '#D1FAE5', onContainer: '#053B2C' },
    darkColors: { main: '#6EE7B7', container: '#064E3B', onContainer: '#D1FAE5' }
  },
  visite: {
    colorName: 'visite',
    label: 'Visite',
    lightColors: { main: '#9C8E00', container: '#FFFBB3', onContainer: '#483F00' },
    darkColors: { main: '#F1DE02', container: '#483F00', onContainer: '#FFFBB3' }
  },
  autre: {
    colorName: 'autre',
    label: 'Autre',
    lightColors: { main: '#6B6B6A', container: '#F1F1EE', onContainer: '#1F1F1E' },
    darkColors: { main: '#A8A8A6', container: '#3A3A39', onContainer: '#F4F4F3' }
  }
}

// On s'appuie sur le namespace global (déclaré par `types/temporal.d.ts`) et
// non sur les types exportés par `temporal-polyfill` : c'est ce même global que
// Schedule-X lit, et les deux jeux de déclarations ne sont pas interchangeables.
type TemporalApi = typeof Temporal
type PlainDateTime = Temporal.PlainDateTime

const calendarApp = shallowRef<CalendarApp | null>(null)
let eventsService: ReturnType<typeof createEventsServicePlugin> | null = null
let calendarControls: ReturnType<typeof createCalendarControlsPlugin> | null = null
let temporal: TemporalApi | null = null

/**
 * Schedule-X v4 ne manipule plus des chaînes de dates mais des objets
 * `Temporal` qu'il lit sur le global (c'est une `peerDependency` de
 * `@schedule-x/calendar`). Tant que tous les navigateurs ne l'implémentent pas,
 * on charge le polyfill — côté client seulement, et seulement s'il manque, pour
 * que la librairie et nous partagions bien la même implémentation : Schedule-X
 * valide les dates de ses événements avec `instanceof`.
 */
async function loadTemporal(): Promise<TemporalApi> {
  if (!('Temporal' in globalThis)) {
    await import('temporal-polyfill/global')
  }
  return Temporal
}

/** Chaîne ISO (UTC) → `Temporal.ZonedDateTime` dans le fuseau du navigateur. */
function toZoned(api: TemporalApi, iso: string) {
  return api.Instant.from(iso).toZonedDateTimeISO(api.Now.timeZoneId())
}

/** Date d'un événement Schedule-X → chaîne ISO (UTC) acceptée par l'API. */
function toIsoString(value: CalendarEvent['start']): string {
  return 'toInstant' in value ? value.toInstant().toString() : value.toString()
}

function toScheduleXEvents(api: TemporalApi, list: ApiCalendarEvent[]): CalendarEvent[] {
  return toDisplayEvents(list).map((display) => ({
    id: display.id,
    title: display.title,
    start: toZoned(api, display.start),
    end: toZoned(api, display.end),
    calendarId: display.calendarId,
    // Propriété « étrangère » : Schedule-X la conserve telle quelle et nous la
    // restitue dans les callbacks, ce qui évite de re-chercher l'événement.
    rawEvent: display.rawEvent
  }))
}

/**
 * `@schedule-x/drag-and-drop` 3.7.3 (dernière version publiée) expose encore les
 * anciens noms `create*DragHandler`, alors que `@schedule-x/calendar` v4 appelle
 * `start*Drag`. Les signatures sont identiques : on ajoute les alias manquants
 * pour rétablir le glisser-déposer. Quand le plugin passera en v4, les méthodes
 * existeront déjà et rien ne sera écrasé.
 */
function createCompatibleDragAndDropPlugin(minutesPerInterval: number) {
  const plugin = createDragAndDropPlugin(minutesPerInterval)
  const bridged = plugin as unknown as Record<string, unknown>
  const aliases: Record<string, string> = {
    startTimeGridDrag: 'createTimeGridDragHandler',
    startDateGridDrag: 'createDateGridDragHandler',
    startMonthGridDrag: 'createMonthGridDragHandler'
  }
  for (const [modernName, legacyName] of Object.entries(aliases)) {
    if (typeof bridged[modernName] === 'function') continue
    const legacy = bridged[legacyName]
    if (typeof legacy !== 'function') continue
    bridged[modernName] = (...args: unknown[]) =>
      (legacy as (...a: unknown[]) => unknown).apply(plugin, args)
  }
  return plugin
}

/**
 * Amène le calendrier sur une date sans le recréer (plugin calendar-controls).
 * @param localDateTime valeur d'un champ `datetime-local` (« 2026-05-18T09:00 »)
 */
function focusCalendarOn(localDateTime: string) {
  const [datePart] = localDateTime.split('T')
  if (!temporal || !calendarControls || !datePart) return
  calendarControls.setDate(temporal.PlainDate.from(datePart))
}

/**
 * Sans le plugin `scroll-controller`, la grille horaire s'ouvre sur minuit.
 * On la repositionne sur le début de journée « utile » après le premier rendu.
 */
function scrollToWorkingHours(wrapper?: HTMLElement) {
  if (!wrapper) return
  requestAnimationFrame(() => {
    const container = wrapper.querySelector('.sx__view-container')
    const grid = wrapper.querySelector('.sx__week-grid')
    if (!(container instanceof HTMLElement) || !(grid instanceof HTMLElement)) return
    container.scrollTop = (grid.clientHeight / 24) * FIRST_VISIBLE_HOUR
  })
}

onMounted(async () => {
  const api = await loadTemporal()
  temporal = api

  eventsService = createEventsServicePlugin()
  calendarControls = createCalendarControlsPlugin()

  const plugins: PluginBase<string>[] = [
    eventsService,
    calendarControls,
    createCurrentTimePlugin()
  ]
  // Seul le tuteur peut modifier un événement (PUT /api/calendar-events/[id]).
  if (isTutor.value) {
    plugins.push(
      createCompatibleDragAndDropPlugin(DRAG_INTERVAL_MINUTES),
      createResizePlugin(DRAG_INTERVAL_MINUTES)
    )
  }

  calendarApp.value = createCalendar(
    {
      locale: 'fr-FR',
      firstDayOfWeek: MONDAY,
      theme: 'shadcn',
      isDark: colorMode.value === 'dark',
      views: [viewMonthGrid, viewWeek, viewDay, viewList],
      defaultView: viewWeek.name,
      calendars,
      monthGridOptions: { nEventsPerDay: 4 },
      events: toScheduleXEvents(api, events.value ?? []),
      callbacks: {
        onRender: ($app) => scrollToWorkingHours($app.elements.calendarWrapper),
        onEventClick: (calendarEvent) => openEventDetail(calendarEvent.rawEvent as ApiCalendarEvent),
        // Clic sur un créneau horaire (semaine / jour) ou sur un jour (mois, liste)
        onClickDateTime: (dateTime) => openCreateAt(dateTime.toPlainDateTime()),
        onClickDate: (date) => openCreateAt(date.toPlainDateTime({ hour: DEFAULT_CREATE_HOUR })),
        onBeforeEventUpdateAsync: persistEventDates
      }
    },
    plugins
  )
})

// Le calendrier n'est pas recréé quand les données changent : le service
// d'événements remplace simplement la liste, ce qui préserve la vue et la date
// courantes choisies par l'utilisateur.
watch(events, (list) => {
  if (!temporal || !eventsService) return
  eventsService.set(toScheduleXEvents(temporal, list ?? []))
})

// Synchronise le thème du calendrier avec le mode clair / sombre de l'app.
watch(
  () => colorMode.value,
  (mode) => calendarApp.value?.setTheme(mode === 'dark' ? 'dark' : 'light')
)

/**
 * Glisser-déposer et redimensionnement : Schedule-X attend un booléen avant
 * d'entériner le déplacement. On persiste d'abord, et un `false` en cas
 * d'échec réseau remet l'événement à sa position d'origine.
 */
async function persistEventDates(
  _oldEvent: CalendarEvent,
  newEvent: CalendarEvent
): Promise<boolean> {
  const startTime = toIsoString(newEvent.start)
  const endTime = toIsoString(newEvent.end)
  try {
    await $fetch(`/api/calendar-events/${newEvent.id}`, {
      method: 'PUT',
      body: { startTime, endTime }
    })
    // Aligne la copie locale (utilisée par les modales) sans relancer un
    // rafraîchissement complet, qui écraserait le rendu en cours de Schedule-X.
    const local = (events.value ?? []).find((e) => e.id === newEvent.id)
    if (local) {
      local.startTime = startTime
      local.endTime = endTime
    }
    toast.add({ title: 'Événement déplacé', color: 'success' })
    return true
  } catch (err: unknown) {
    toast.add({
      title: readErrorMessage(err) ?? 'Impossible de déplacer l\'événement.',
      color: 'error'
    })
    return false
  }
}

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

function openCreate() {
  resetCreateState()
  createOpen.value = true
}

/**
 * Clic sur un créneau vide : ouvre la création pré-remplie sur une heure.
 * Réservé au tuteur, seul rôle autorisé à créer un événement.
 */
function openCreateAt(start: PlainDateTime) {
  if (!isTutor.value) return
  const end = start.add({ hours: 1 })
  resetCreateState()
  createState.startTime = start.toString({ smallestUnit: 'minute' })
  createState.endTime = end.toString({ smallestUnit: 'minute' })
  createOpen.value = true
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
    focusCalendarOn(createdOn)
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

<style>
/* Schedule-X (thème shadcn) — mapping sur les tokens UI (clair / sombre).
   Les règles ciblent `.sx-calendar-shell` : le calendrier est rendu par Preact,
   ses nœuds ne portent donc pas d'attribut de scope Vue. */

/* Hauteur calée sur le viewport (nav 3.5rem + paddings + en-tête de page +
   footer ≈ 19rem) : le calendrier tient dans la page sans la faire déborder,
   `.sx__view-container` scrolle en interne pour le reste de la grille 24 h. */
.sx-calendar-shell {
  height: calc(100vh - 19rem);
  min-height: 420px;
}
.sx-calendar-shell .sx-vue-calendar-wrapper {
  height: 100%;
}

/* Le thème shadcn embarque sa propre palette : on la remplace par celle de
   l'app. Comme les variables `--ui-*` basculent déjà avec la classe `.dark`,
   une seule déclaration couvre les deux thèmes. Le sélecteur `.is-dark` est
   répété pour passer devant la règle `html:has(.is-shadcn) .is-dark` du thème,
   plus spécifique que la variante sans `.is-dark`. */
.sx-calendar-shell .sx__calendar-wrapper,
.sx-calendar-shell .sx__calendar-wrapper.is-dark {
  --sx-color-background: var(--ui-bg-elevated);
  --sx-color-surface: var(--ui-bg-elevated);
  --sx-color-surface-dim: var(--ui-bg-muted);
  --sx-color-surface-bright: var(--ui-bg-elevated);
  --sx-color-surface-container: var(--ui-bg-muted);
  --sx-color-surface-container-low: var(--ui-bg-muted);
  --sx-color-surface-container-high: var(--ui-bg-accented);
  --sx-color-on-background: var(--ui-text);
  --sx-color-on-surface: var(--ui-text);
  --sx-internal-color-text: var(--ui-text);
  --sx-internal-color-light-gray: var(--ui-bg-muted);
  --sx-internal-color-gray-ripple-background: var(--ui-bg-accented);
  --sx-color-outline: var(--ui-border-accented);
  --sx-color-outline-variant: var(--ui-border);
  --sx-color-popup-border: var(--ui-border);
  --sx-border: 1px solid var(--ui-border);
  --sx-color-primary: var(--ui-text);
  --sx-color-on-primary: var(--ui-text-inverted);
  --sx-color-primary-container: var(--ui-bg-inverted);
  --sx-color-on-primary-container: var(--ui-text-inverted);
  --sx-rounding-extra-small: var(--ui-radius);
  --sx-rounding-small: var(--ui-radius);
  --sx-rounding-medium: var(--ui-radius);
  font-family: inherit;
}

/* La carte de la page porte déjà une bordure : celle du calendrier ferait doublon. */
.sx-calendar-shell .sx__calendar {
  border: none;
}

/* Les événements ouvrent la modale de détail : le curseur et un léger
   estompage au survol le signalent. */
.sx-calendar-shell .sx__event {
  cursor: pointer;
  transition: opacity 0.15s ease;
}
.sx-calendar-shell .sx__event:hover {
  opacity: 0.9;
}
</style>
