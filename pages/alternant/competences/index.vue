<script setup lang="ts">
const { user } = useUserSession()

// --- Types ------------------------------------------------------------------
interface CompetencyCell {
  id: string
  label: string
  level: string | null
  comment: string | null
}

interface CompetencyMapDomain {
  id: string
  label: string
  progress: number | null
  competencies: CompetencyCell[]
}

interface CompetencyMap {
  domains: CompetencyMapDomain[]
  overall: number | null
}

const emptyMap = (): CompetencyMap => ({ domains: [], overall: null })

const { data: learnerMap } = await useFetch<CompetencyMap>(
  () => `/api/users/${user.value?.id ?? ''}/competencies`,
  {
    default: emptyMap,
    immediate: !!user.value?.id
  }
)

const learnerOverall = computed<string>(() => {
  const o = learnerMap.value?.overall
  return o != null ? `${o}%` : '-'
})
</script>

<template>
  <div class="w-full px-6 py-10 space-y-6">
    <PageHeader
      title="Compétences"
      subtitle="Votre progression par domaine."
    />

    <StatCard label="Progression globale" :value="learnerOverall" />

    <div
      v-if="(learnerMap?.domains.length ?? 0) === 0"
      class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
    >
      Votre tuteur n'a pas encore défini de référentiel de compétences.
    </div>

    <div
      v-for="domain in learnerMap?.domains ?? []"
      :key="domain.id"
      class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5 space-y-4"
    >
      <div class="flex items-center justify-between gap-4">
        <h2 class="text-base font-semibold text-[var(--ui-text)]">
          {{ domain.label }}
        </h2>
        <span class="text-sm text-[var(--ui-text-muted)]">
          {{ domain.progress != null ? domain.progress + '%' : '-' }}
        </span>
      </div>

      <div class="h-2 rounded-full bg-[var(--ui-bg-muted)] overflow-hidden">
        <div
          class="h-full bg-[var(--ui-bg-inverted)]"
          :style="{ width: (domain.progress ?? 0) + '%' }"
        />
      </div>

      <ul class="space-y-2">
        <li
          v-for="c in domain.competencies"
          :key="c.id"
          class="flex items-center justify-between gap-4"
        >
          <span class="text-sm text-[var(--ui-text)]">{{ c.label }}</span>
          <CompetencyLevelBadge :level="c.level" />
        </li>
      </ul>
    </div>
  </div>
</template>
