<script setup lang="ts">
import {
  countsAsWorked,
  formatDuration,
  presenceKindIcon,
  presenceKindShortLabel,
  type PresenceEntry
} from '~/shared/utils/presence-entries'

const props = withDefaults(
  defineProps<{
    entry: PresenceEntry
    /** Affiche le nom de la personne pointée (vue tuteur). */
    showStudent?: boolean
    /** Bouton d'historique + badge « Modifié » (réservés au tuteur : seul lui a accès à l'API d'historique). */
    showHistory?: boolean
  }>(),
  { showStudent: false, showHistory: false }
)

const emit = defineEmits<{ edit: [PresenceEntry]; remove: [PresenceEntry]; history: [PresenceEntry] }>()

const dayFmt = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long'
})

// `date` est une clef `AAAA-MM-JJ` : on la lit en heure locale (sans `Z`) pour
// que le jour affiché soit exactement celui qui a été pointé.
const dayLabel = computed(() => dayFmt.format(new Date(`${props.entry.date}T00:00:00`)))
const durationLabel = computed(() => formatDuration(props.entry.minutes))
// `locked` reflète déjà le droit du viewer courant, calculé côté serveur
// (apprenant propriétaire => verrouillé, tuteur => jamais) : on ne recode
// aucune logique de rôle ici, on affiche/masque simplement selon ce champ.
const canEdit = computed(() => !props.entry.locked)
const isRevised = computed(() => props.entry.revisionCount > 1)
</script>

<template>
  <div
    class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-4 flex items-center justify-between gap-4 flex-wrap"
  >
    <div class="min-w-0 space-y-1">
      <div class="flex items-center gap-2 flex-wrap">
        <p class="text-sm font-semibold text-[var(--ui-text)] first-letter:uppercase">
          {{ dayLabel }}
        </p>
        <UBadge v-if="showStudent && entry.student" color="neutral" variant="soft" class="font-normal">
          {{ entry.student.firstName }} {{ entry.student.lastName }}
        </UBadge>
        <UBadge color="neutral" variant="subtle" class="font-normal gap-1">
          <UIcon :name="presenceKindIcon(entry.kind)" class="size-3.5" />
          {{ presenceKindShortLabel(entry.kind) }}
        </UBadge>
        <UBadge v-if="showHistory && isRevised" color="warning" variant="subtle" class="font-normal">
          Modifié
        </UBadge>
      </div>
      <p class="text-sm text-[var(--ui-text-muted)] flex items-center gap-1.5">
        <UIcon name="i-lucide-clock" class="size-3.5 shrink-0" />
        {{ entry.startTime }} → {{ entry.endTime }}
      </p>
      <p v-if="entry.recordedBy" class="text-xs text-[var(--ui-text-dimmed)]">
        Pointé par {{ entry.recordedBy.firstName }} {{ entry.recordedBy.lastName }}
      </p>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      <UBadge v-if="countsAsWorked(entry.kind)" color="neutral" variant="subtle" class="font-normal">
        {{ durationLabel }}
      </UBadge>
      <UButton
        v-if="showHistory"
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-history"
        :aria-label="`Voir l'historique du pointage du ${dayLabel}`"
        @click="emit('history', entry)"
      />
      <template v-if="canEdit">
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-pencil"
          :aria-label="`Modifier le pointage du ${dayLabel}`"
          @click="emit('edit', entry)"
        />
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-trash-2"
          :aria-label="`Supprimer le pointage du ${dayLabel}`"
          @click="emit('remove', entry)"
        />
      </template>
    </div>
  </div>
</template>
