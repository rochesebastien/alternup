<script setup lang="ts">
import type { CompetencyLevel } from '~/shared/utils/enums'
import { competencyLevelColor, competencyLevelLabel } from '~/shared/utils/competencies'

const props = defineProps<{ level: string | null }>()

const levelEnum = computed<CompetencyLevel | null>(
  () => (props.level ? (props.level as CompetencyLevel) : null)
)
</script>

<template>
  <UBadge
    v-if="levelEnum"
    :color="competencyLevelColor(levelEnum)"
    variant="subtle"
    class="font-normal"
  >
    {{ competencyLevelLabel(levelEnum) }}
  </UBadge>
  <UBadge
    v-else
    color="neutral"
    variant="subtle"
    class="font-normal"
  >
    Non évalué
  </UBadge>
</template>
