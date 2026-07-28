<template>
  <div class="flex items-end justify-between gap-4 flex-wrap border-b border-[var(--ui-border)] pb-5">
    <div class="min-w-0">
      <h1 class="text-xl font-semibold tracking-tight text-[var(--ui-text)]">{{ title }}</h1>
      <p v-if="subtitle" class="text-sm text-[var(--ui-text-muted)] mt-1">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>()
</script>
