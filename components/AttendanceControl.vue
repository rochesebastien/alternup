<script setup lang="ts">
import type { AttendanceStatus } from '@prisma/client'
import { ATTENDANCE_STATUS_OPTIONS } from '~/shared/utils/attendance'

const props = defineProps<{
  eventId: string
  modelStatus: string | null
  minutesLate?: number | null
}>()

const emit = defineEmits<{ saved: [] }>()

const pending = ref<AttendanceStatus | null>(null)

async function record(status: AttendanceStatus): Promise<void> {
  if (pending.value) return
  pending.value = status
  try {
    await $fetch(`/api/events/${props.eventId}/attendance`, {
      method: 'POST',
      body: { status }
    })
    emit('saved')
  } finally {
    pending.value = null
  }
}
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <UButton
      v-for="option in ATTENDANCE_STATUS_OPTIONS"
      :key="option.value"
      size="sm"
      color="neutral"
      :variant="props.modelStatus === option.value ? 'solid' : 'outline'"
      :loading="pending === option.value"
      :disabled="pending !== null && pending !== option.value"
      @click="record(option.value)"
    >
      {{ option.label }}
    </UButton>
  </div>
</template>
