<script setup lang="ts">
interface Props {
  label: string
  value: string | number
  hint?: string
  icon?: string
}

defineProps<Props>()
</script>

<template>
  <div class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5">
    <div class="flex items-center justify-between">
      <span class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">
        {{ label }}
      </span>
      <UIcon
        v-if="icon"
        :name="icon"
        class="size-4 text-[var(--ui-text-dimmed)]"
      />
    </div>
    <p class="text-2xl font-semibold tracking-tight text-[var(--ui-text)] mt-2">
      {{ value }}
    </p>
    <p
      v-if="hint"
      class="text-xs text-[var(--ui-text-muted)] mt-1"
    >
      {{ hint }}
    </p>
  </div>
</template>
