<script setup lang="ts">
import type { RiskLevel } from '~/shared/utils/risk'
import { riskLevelColor, riskLevelLabel } from '~/shared/utils/risk'

const props = defineProps<{
  level: string | null
  score?: number | null
}>()

const level = computed<RiskLevel>(() => (props.level as RiskLevel | null) ?? 'ok')

const color = computed<'success' | 'warning' | 'error'>(() => riskLevelColor(level.value))

const label = computed<string>(() => riskLevelLabel(level.value))
</script>

<template>
  <UBadge
    :color="color"
    variant="subtle"
    class="font-normal"
    :title="`Score de risque : ${score ?? 0}/100`"
  >
    {{ label }}<template v-if="score != null"> · {{ score }}</template>
  </UBadge>
</template>
