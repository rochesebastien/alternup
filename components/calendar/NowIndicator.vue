<script setup lang="ts">
import { PX_PER_MINUTE } from '~/shared/utils/calendar-layout'

const now = useNow({ interval: 60_000 })

const top = computed(() => (now.value.getHours() * 60 + now.value.getMinutes()) * PX_PER_MINUTE)
</script>

<template>
  <div
    class="absolute inset-x-0 z-10 border-t-2 border-[var(--ui-error)] pointer-events-none"
    :style="{ top: `${top}px` }"
  >
    <div class="absolute -top-[5px] -left-1 size-2 rounded-full bg-[var(--ui-error)]" />
  </div>
</template>
