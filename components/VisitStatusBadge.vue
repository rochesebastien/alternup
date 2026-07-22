<template>
  <UBadge
    :color="visitStatusColor(status as VisitStatus)"
    variant="subtle"
    class="font-normal"
  >
    {{ visitStatusLabel(status as VisitStatus) }}
  </UBadge>
</template>

<script setup lang="ts">
import type { VisitStatus } from '@prisma/client'
import {
  visitStatusColor,
  visitStatusLabel
} from '~/shared/utils/tutor-visits'

defineProps<{ status: string }>()
</script>
