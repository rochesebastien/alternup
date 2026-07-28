<template>
  <div class="mx-auto max-w-6xl px-6 py-10 space-y-6">
    <PageHeader
      title="Calendrier"
      :subtitle="isTutor ? 'Sessions et rendez-vous avec vos learners.' : 'Vos cours et rendez-vous à venir.'"
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
        <FullCalendar v-if="calendarOptions" :options="calendarOptions" />
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

          <UFormField label="Learner" name="studentId" required>
            <USelect
              v-model="createState.studentId"
              :items="learnerItems"
              value-key="value"
              placeholder="Sélectionner un learner…"
              class="w-full"
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
import { Role } from '@prisma/client'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import frLocale from '@fullcalendar/core/locales/fr'
import type { EventClickArg } from '@fullcalendar/core'
import {
  toFullCalendarEvents,
  type ApiCalendarEvent
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
const { user } = useUserSession()
const isTutor = computed(() => user.value?.role === Role.Tutor)
// Forwarde les cookies de session lors du rendu serveur (sinon 401 sur les $fetch SSR)
const requestFetch = useRequestFetch()

interface CourseNote extends NoteByAssignmentRef {
  assignment?: { course?: { id: string; title: string } }
}

const eventsUrl = computed(() => `/api/users/${user.value?.id ?? ''}/calendar`)

const {
  data: events,
  error: loadError,
  refresh: refreshEvents
} = await useFetch<ApiCalendarEvent[]>(eventsUrl, { default: () => [] })

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

const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
  initialView: 'timeGridWeek',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
  },
  locale: frLocale,
  height: 'auto',
  weekNumbers: false,
  nowIndicator: true,
  events: toFullCalendarEvents(events.value ?? []),
  eventClick: onEventClick
}))

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

function onEventClick(arg: EventClickArg) {
  const raw = arg.event.extendedProps.rawEvent as ApiCalendarEvent
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
    studentId: z.string().uuid('Sélection requise'),
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

const createState = reactive({ title: '', studentId: '', startTime: '', endTime: '' })
const createPending = ref(false)
const createError = ref<string | null>(null)

function openCreate() {
  createState.title = ''
  createState.studentId = ''
  createState.startTime = ''
  createState.endTime = ''
  createError.value = null
  createOpen.value = true
}

async function onCreateSubmit() {
  createPending.value = true
  createError.value = null
  try {
    await $fetch('/api/calendar-events', {
      method: 'POST',
      body: {
        title: createState.title,
        studentId: createState.studentId,
        startTime: new Date(createState.startTime).toISOString(),
        endTime: new Date(createState.endTime).toISOString()
      }
    })
    createOpen.value = false
    toast.add({ title: 'Événement créé', color: 'success' })
    await refreshEvents()
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
/* FullCalendar — mapping sur les tokens UI (clair / sombre) */
.fc {
  font-family: inherit;
  color: var(--ui-text);

  --fc-border-color: var(--ui-border);
  --fc-page-bg-color: var(--ui-bg);
  --fc-neutral-bg-color: var(--ui-bg-muted);
  --fc-list-event-hover-bg-color: var(--ui-bg-elevated);
  --fc-today-bg-color: color-mix(in oklab, var(--ui-primary) 12%, transparent);
  --fc-now-indicator-color: #ef4444;

  /* Boutons toolbar */
  --fc-button-bg-color: var(--ui-bg-elevated);
  --fc-button-border-color: var(--ui-border);
  --fc-button-text-color: var(--ui-text);
  --fc-button-hover-bg-color: var(--ui-bg-accented);
  --fc-button-hover-border-color: var(--ui-border-accented);
  --fc-button-active-bg-color: var(--ui-bg-inverted);
  --fc-button-active-border-color: var(--ui-bg-inverted);

  /* Évènements → chips neutres foncés (style minimaliste) */
  --fc-event-bg-color: var(--ui-bg-inverted);
  --fc-event-border-color: var(--ui-bg-inverted);
  --fc-event-text-color: var(--ui-text-inverted);
}

.fc .fc-toolbar-title {
  font-size: 1.15rem;
  font-weight: 600;
}

.fc .fc-button {
  font-weight: 500;
  border-radius: var(--ui-radius);
  padding: 0.4rem 0.8rem;
  font-size: 0.875rem;
  text-transform: none;
  box-shadow: none;
}
.fc .fc-button:focus,
.fc .fc-button:focus-visible {
  box-shadow: 0 0 0 2px var(--ui-bg), 0 0 0 4px color-mix(in oklab, var(--ui-text) 25%, transparent);
}
/* Le bouton actif (vue courante + Aujourd'hui) → foncé sur texte inversé */
.fc .fc-button-primary:not(:disabled).fc-button-active,
.fc .fc-button-primary:not(:disabled):active {
  color: var(--ui-text-inverted);
}

/* Cellules / headers */
.fc-theme-standard td,
.fc-theme-standard th,
.fc-theme-standard .fc-scrollgrid {
  border-color: var(--ui-border);
}
.fc .fc-col-header-cell-cushion,
.fc .fc-daygrid-day-number,
.fc .fc-list-day-text,
.fc .fc-list-day-side-text,
.fc .fc-timegrid-axis-cushion,
.fc .fc-timegrid-slot-label-cushion {
  color: var(--ui-text);
}
.fc .fc-day-other .fc-daygrid-day-number {
  color: var(--ui-text-dimmed);
}
.fc .fc-list-empty {
  color: var(--ui-text-muted);
  background: var(--ui-bg-muted);
}
</style>
