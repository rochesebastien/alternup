<script setup lang="ts">
import { PRESENCE_KIND_OPTIONS, type PresenceKind } from '~/shared/utils/presence-entries'

/**
 * Choix du type de journée, en contrôle segmenté.
 *
 * Pas de `UTabs` ici : son indicateur de sélection est un bloc unique
 * positionné sur la liste, qui déborde dès que les onglets passent à la ligne
 * (dans la modale du tuteur, la pastille active couvrait deux libellés à la
 * fois). Une grille de boutons indépendants se replie proprement en 2×2.
 */
const model = defineModel<PresenceKind>({ required: true })
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
    <button
      v-for="option in PRESENCE_KIND_OPTIONS"
      :key="option.value"
      type="button"
      :aria-pressed="model === option.value"
      class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-left transition-colors"
      :class="model === option.value
        ? 'border-transparent bg-[var(--ui-bg-inverted)] text-[var(--ui-text-inverted)]'
        : 'border-[var(--ui-border)] text-[var(--ui-text-muted)] hover:bg-[var(--ui-bg-elevated)] hover:text-[var(--ui-text)]'"
      @click="model = option.value"
    >
      <UIcon :name="option.icon" class="size-4 shrink-0" />
      <span class="truncate">{{ option.label }}</span>
    </button>
  </div>
</template>
