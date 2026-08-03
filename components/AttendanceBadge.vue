<script setup lang="ts">
import type { AttendanceStatus } from '~/shared/utils/enums'
import { attendanceStatusColor, attendanceStatusLabel } from '~/shared/utils/attendance'

const props = defineProps<{
  status: string | null
  minutesLate?: number | null
}>()

const statusEnum = computed<AttendanceStatus | null>(
  () => (props.status ? (props.status as AttendanceStatus) : null)
)

const color = computed<'success' | 'error' | 'warning' | 'neutral'>(() =>
  statusEnum.value ? attendanceStatusColor(statusEnum.value) : 'neutral'
)

const label = computed<string>(() => {
  if (!statusEnum.value) return 'Non pointé'
  if (statusEnum.value === 'retard' && props.minutesLate != null) {
    return `Retard (${props.minutesLate}min)`
  }
  return attendanceStatusLabel(statusEnum.value)
})
</script>

<template>
  <UBadge :color="color" variant="subtle" class="font-normal">
    {{ label }}
  </UBadge>
</template>
