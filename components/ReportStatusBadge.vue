<template>
  <UBadge
    :color="reportStatusColor(status as ReportStatus)"
    variant="subtle"
    class="font-normal"
  >
    {{ reportStatusLabel(status as ReportStatus) }}
  </UBadge>
</template>

<script setup lang="ts">
import type { ReportStatus } from '@prisma/client'
import {
  reportStatusColor,
  reportStatusLabel
} from '~/shared/utils/progress-reports'

defineProps<{ status: string }>()
</script>
