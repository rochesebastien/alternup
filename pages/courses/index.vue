<template>
  <div class="max-w-4xl mx-auto px-4 py-8 space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Mes cours</h1>
      <p class="text-sm text-gray-500">
        Sessions à venir et passées avec leurs notes personnelles.
      </p>
    </div>

    <UAlert
      v-if="eventsError"
      color="error"
      variant="soft"
      title="Erreur de chargement"
      :description="eventsError.message"
    />

    <div v-if="eventsStatus === 'pending'" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8 text-primary-500" />
    </div>

    <UCard v-else-if="sessions.length === 0">
      <p class="text-gray-500 text-center py-6">
        Aucun cours n'est pour le moment programmé dans votre agenda.
      </p>
    </UCard>

    <UCard v-for="session in sessions" v-else :key="session.id">
      <template #header>
        <div class="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">
              {{ session.courseAssignment?.course.title ?? session.title }}
            </h2>
            <p class="text-sm text-gray-500 mt-1">
              {{ formatDate(session.startTime) }} · {{ formatTimeRange(session.startTime, session.endTime) }}
            </p>
          </div>
          <UBadge
            v-if="existingNoteFor(session)"
            color="success"
            variant="subtle"
            icon="i-lucide-check"
          >
            Note enregistrée
          </UBadge>
        </div>
      </template>

      <UForm
        :state="stateFor(session)"
        :schema="noteFormSchema"
        class="space-y-4"
        @submit="onSubmit(session)"
      >
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <UFormField label="Note (sur 20)" name="grade">
            <UInput
              v-model="stateFor(session).grade"
              type="number"
              min="0"
              max="20"
              step="0.25"
              placeholder="—"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Notions vues" name="notions" class="sm:col-span-2">
            <UInput
              v-model="stateFor(session).notions"
              placeholder="Algèbre, Géométrie, …"
              class="w-full"
            />
            <template #help>
              <span class="text-xs text-gray-500">Séparées par des virgules.</span>
            </template>
          </UFormField>
        </div>

        <UFormField label="Commentaire" name="comment">
          <UTextarea
            v-model="stateFor(session).comment"
            :rows="3"
            class="w-full"
            placeholder="Ce que vous avez retenu, ce qui reste flou…"
          />
        </UFormField>

        <UAlert
          v-if="errors[session.id]"
          color="error"
          variant="soft"
          :title="errors[session.id] ?? ''"
        />

        <div class="flex justify-end">
          <UButton type="submit" color="primary" :loading="pending[session.id]">
            Enregistrer
          </UButton>
        </div>
      </UForm>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { z } from 'zod'
import { Role } from '@prisma/client'
import {
  findNoteForSession,
  notionsToString,
  parseNotions,
  type NoteByAssignmentRef
} from '~/shared/utils/course-notes'

definePageMeta({
  middleware: ['role'],
  requireRole: [Role.Alternant, Role.Stagiaire]
})

interface CourseRef {
  id: string
  title: string
}

interface AssignmentRef {
  id: string
  course: CourseRef
}

interface CalendarEvent {
  id: string
  studentId: string
  tutorId: string
  title: string
  startTime: string
  endTime: string
  courseAssignmentId: string | null
  courseAssignment: AssignmentRef | null
}

interface CourseNote extends NoteByAssignmentRef {
  assignment?: { course?: CourseRef }
}

const toast = useToast()
const { user } = useUserSession()

const {
  data: events,
  status: eventsStatus,
  error: eventsError,
  refresh: refreshEvents
} = await useFetch<CalendarEvent[]>(
  () => `/api/users/${user.value?.id ?? ''}/calendar`,
  { default: () => [] }
)

const { data: notes, refresh: refreshNotes } = await useFetch<CourseNote[]>(
  '/api/course-notes',
  { default: () => [] }
)

const sessions = computed(() =>
  (events.value ?? [])
    .filter((e): e is CalendarEvent & { courseAssignment: AssignmentRef } =>
      e.courseAssignment !== null
    )
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
)

function existingNoteFor(session: CalendarEvent): CourseNote | null {
  if (!session.courseAssignmentId) return null
  return (
    (findNoteForSession(notes.value ?? [], session.courseAssignmentId, session.startTime) as
      | CourseNote
      | null) ?? null
  )
}

interface NoteFormState {
  grade: string
  comment: string
  notions: string
}

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

const states = reactive<Record<string, NoteFormState>>({})
const pending = reactive<Record<string, boolean>>({})
const errors = reactive<Record<string, string | null>>({})

function stateFor(session: CalendarEvent): NoteFormState {
  let current = states[session.id]
  if (!current) {
    const existing = existingNoteFor(session)
    current = {
      grade: existing?.grade != null ? String(existing.grade) : '',
      comment: existing?.comment ?? '',
      notions: existing ? notionsToString(existing.notionsCovered) : ''
    }
    states[session.id] = current
  }
  return current
}

async function onSubmit(session: CalendarEvent) {
  const state = stateFor(session)
  pending[session.id] = true
  errors[session.id] = null

  const trimmedGrade = state.grade.trim()
  const body = {
    grade: trimmedGrade === '' ? null : Number(trimmedGrade),
    comment: state.comment.trim() === '' ? null : state.comment,
    notionsCovered: state.notions.trim() === '' ? null : parseNotions(state.notions)
  }

  try {
    await $fetch(`/api/events/${session.id}/notes`, { method: 'POST', body })
    toast.add({ title: 'Note enregistrée', color: 'success' })
    await Promise.all([refreshNotes(), refreshEvents()])
  } catch (err: unknown) {
    errors[session.id] = readErrorMessage(err) ?? 'Impossible d\'enregistrer.'
  } finally {
    pending[session.id] = false
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
  return (
    e.data?.statusMessage ||
    e.data?.issues?.[0]?.message ||
    e.statusMessage ||
    null
  )
}
</script>
