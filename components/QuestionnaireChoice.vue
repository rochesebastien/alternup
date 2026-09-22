<template>
  <!-- Option d'un questionnaire : raccourci clavier à gauche, libellé et
       description, indicateur de sélection à droite. Bouton (et non input
       radio natif) pour garder un rendu identique au clic, au clavier et via
       le raccourci ; l'état est exposé par aria-checked. -->
  <button
    type="button"
    :role="multiple ? 'checkbox' : 'radio'"
    :aria-checked="selected"
    :data-checked="selected || undefined"
    class="group flex w-full cursor-pointer items-start gap-3 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] px-4 py-3 text-left transition-colors hover:border-[var(--ui-border-accented)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-primary)] data-checked:border-[var(--ui-text)] data-checked:bg-[var(--ui-bg-muted)]"
    @click="$emit('select')"
    @keydown.enter.prevent="context?.next()"
  >
    <UKbd
      v-if="shortcut"
      :value="shortcut"
      size="md"
      class="mt-0.5 shrink-0 group-data-checked:border-[var(--ui-text)] group-data-checked:text-[var(--ui-text)]"
      aria-hidden="true"
    />
    <UIcon
      v-if="icon"
      :name="icon"
      class="mt-0.5 size-5 shrink-0 text-[var(--ui-text-muted)] group-data-checked:text-[var(--ui-text)]"
      aria-hidden="true"
    />
    <span class="min-w-0 flex-1">
      <span class="block text-sm font-medium text-[var(--ui-text)]">{{ label }}</span>
      <span v-if="description" class="mt-0.5 block text-sm text-[var(--ui-text-muted)]">
        {{ description }}
      </span>
    </span>
    <span
      class="mt-0.5 flex size-5 shrink-0 items-center justify-center border border-[var(--ui-border-accented)] transition-colors group-data-checked:border-[var(--ui-text)] group-data-checked:bg-[var(--ui-text)]"
      :class="multiple ? 'rounded-[4px]' : 'rounded-full'"
      aria-hidden="true"
    >
      <UIcon
        name="i-lucide-check"
        class="size-3.5 text-[var(--ui-text-inverted)] opacity-0 transition-opacity group-data-checked:opacity-100"
      />
    </span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  description?: string
  icon?: string
  shortcut?: string | null
  multiple?: boolean
  selected?: boolean
}>()

defineEmits<{ select: [] }>()

const context = useQuestionnaireContext()
</script>
