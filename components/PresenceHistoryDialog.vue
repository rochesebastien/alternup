<script setup lang="ts">
import {
  presenceKindLabel,
  type PresenceEntry,
  type PresenceEntryRevision
} from '~/shared/utils/presence-entries'

const props = defineProps<{ entry: PresenceEntry | null }>()
const open = defineModel<boolean>('open', { default: false })

const revisions = ref<PresenceEntryRevision[]>([])
const pending = ref(false)
const error = ref<string | null>(null)

const dayFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })
const changedAtFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' })

const title = computed<string>(() => {
  if (!props.entry) return 'Historique du pointage'
  const day = dayFormatter.format(new Date(`${props.entry.date}T00:00:00`))
  return props.entry.student
    ? `Historique — ${day} · ${props.entry.student.firstName} ${props.entry.student.lastName}`
    : `Historique — ${day}`
})

function actionLabel(revision: PresenceEntryRevision): string {
  return revision.action === 'created' ? 'a créé le pointage' : 'a modifié le pointage'
}

function readErrorMessage(err: unknown): string | null {
  const e = err as { statusMessage?: string; data?: { statusMessage?: string } }
  return e.data?.statusMessage || e.statusMessage || null
}

// Déclenché uniquement par l'ouverture de la boîte de dialogue (clic sur le
// bouton d'historique) : jamais au rendu serveur, `$fetch` est donc sûr ici.
async function loadRevisions(): Promise<void> {
  if (!props.entry) return
  pending.value = true
  error.value = null
  try {
    revisions.value = await $fetch<PresenceEntryRevision[]>(
      `/api/presence-entries/${props.entry.id}/revisions`
    )
  } catch (err: unknown) {
    revisions.value = []
    error.value = readErrorMessage(err) ?? "Impossible de charger l'historique."
  } finally {
    pending.value = false
  }
}

watch(open, (value) => {
  if (value) {
    loadRevisions()
  } else {
    // Repart d'un état propre à la prochaine ouverture (autre journée).
    revisions.value = []
    error.value = null
  }
})
</script>

<template>
  <UModal v-model:open="open" :title="title">
    <template #body>
      <div v-if="pending" class="py-8 text-center text-sm text-[var(--ui-text-muted)]">
        Chargement de l'historique…
      </div>
      <UAlert
        v-else-if="error"
        color="error"
        variant="soft"
        icon="i-lucide-triangle-alert"
        :title="error"
      />
      <div
        v-else-if="revisions.length === 0"
        class="py-8 text-center text-sm text-[var(--ui-text-muted)]"
      >
        Aucun historique disponible pour ce pointage.
      </div>
      <ul v-else class="space-y-3">
        <li
          v-for="revision in revisions"
          :key="revision.id"
          class="rounded-lg border border-[var(--ui-border)] p-3 space-y-1"
        >
          <p class="text-sm text-[var(--ui-text)]">
            <span class="font-semibold">{{ revision.changedBy.firstName }} {{ revision.changedBy.lastName }}</span>
            {{ actionLabel(revision) }} — {{ revision.startTime }} → {{ revision.endTime }}
            · {{ presenceKindLabel(revision.kind) }}
          </p>
          <p class="text-xs text-[var(--ui-text-dimmed)]">
            {{ changedAtFormatter.format(new Date(revision.changedAt)) }}
          </p>
        </li>
      </ul>
    </template>
  </UModal>
</template>
