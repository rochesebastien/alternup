<script setup lang="ts">
import type { ReportCardSnapshot } from '~/shared/utils/report-periods'

interface ReportCardItem {
  id: string
  periodId: string
  studentId: string
  generalComment: string | null
  snapshot: ReportCardSnapshot
  publishedAt: string
  createdAt: string
  updatedAt: string
  period: {
    label: string
    startDate: string
    endDate: string
  }
}

const { data: cards, error: cardsError } = await useFetch<ReportCardItem[]>(
  '/api/report-cards',
  { default: () => [] }
)
</script>

<template>
  <div class="w-full px-6 py-10 space-y-6">
    <PageHeader
      title="Bulletins"
      subtitle="Vos bulletins d'évaluation publiés."
    />

    <UAlert
      v-if="cardsError"
      color="error"
      variant="soft"
      title="Erreur de chargement"
      :description="cardsError.message"
    />

    <div
      v-if="cards.length === 0"
      class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
    >
      Vous n'avez pas encore de bulletin publié.
    </div>

    <div v-else class="space-y-6">
      <div
        v-for="card in cards"
        :key="card.id"
        class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5 space-y-4"
      >
        <ReportCardView
          :snapshot="card.snapshot"
          :general-comment="card.generalComment"
          :period-label="card.period.label"
        />

        <div class="flex justify-end">
          <UButton
            color="neutral"
            variant="outline"
            icon="i-lucide-pen-line"
            :to="`/alternant/bulletins/carte/${card.id}`"
          >
            Consulter et signer
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
