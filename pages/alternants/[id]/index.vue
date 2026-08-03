<template>
  <div class="mx-auto max-w-6xl px-6 py-10 space-y-6">
    <UButton
      variant="link"
      color="neutral"
      icon="i-lucide-arrow-left"
      to="/alternants"
      class="-ml-2 px-2 text-[var(--ui-text-muted)]"
    >
      Retour à la liste
    </UButton>

    <div v-if="status === 'pending'" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="animate-spin h-6 w-6 text-[var(--ui-text-dimmed)]" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      :title="error.statusMessage ?? 'Fiche introuvable'"
      description="Cette personne n'existe pas ou n'est pas rattachée à votre réseau."
    />

    <template v-else-if="overview">
      <PageHeader
        :title="`${overview.student.firstName} ${overview.student.lastName}`"
        :subtitle="overview.student.email"
      >
        <template #actions>
          <div class="flex items-center gap-2">
            <UBadge color="neutral" variant="subtle" class="font-normal">
              {{ overview.student.role }}
            </UBadge>
            <RiskBadge :level="overview.risk.level" :score="overview.risk.score" />
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-book-open"
              :to="`/alternants/${overview.student.id}/livret`"
            >
              Livret
            </UButton>
          </div>
        </template>
      </PageHeader>

      <p v-if="overview.student.addedAt" class="-mt-2 text-sm text-[var(--ui-text-muted)]">
        Rattaché à votre réseau depuis le {{ formatDate(overview.student.addedAt) }}.
      </p>

      <section
        v-if="overview.risk.reasons.length"
        class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5"
      >
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-triangle-alert"
            class="size-4"
            :class="overview.risk.level === 'alerte' ? 'text-[var(--ui-error)]' : 'text-[var(--ui-warning)]'"
          />
          <h2 class="text-sm font-semibold text-[var(--ui-text)]">
            Signaux de décrochage
          </h2>
        </div>
        <ul class="mt-3 space-y-1.5 text-sm text-[var(--ui-text-toned)] list-disc pl-5">
          <li v-for="(reason, index) in overview.risk.reasons" :key="index">
            {{ reason }}
          </li>
        </ul>
      </section>

      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Moyenne générale"
          :value="formatGrade20(overview.kpis.avgGrade)"
          icon="i-lucide-notebook-pen"
        />
        <StatCard
          label="Taux de présence"
          :value="formatPercent(overview.kpis.attendanceRate)"
          :hint="`${overview.kpis.attendanceRecorded} ${overview.kpis.attendanceRecorded > 1 ? 'sessions pointées' : 'session pointée'}`"
          icon="i-lucide-calendar-check"
        />
        <StatCard
          label="Missions"
          :value="overview.kpis.missionsTotal"
          :hint="missionsHint"
          icon="i-lucide-briefcase"
        />
        <StatCard
          label="Compétences acquises"
          :value="formatPercent(overview.kpis.competencyRate)"
          :hint="`${overview.kpis.competencyTotal} au référentiel`"
          icon="i-lucide-target"
        />
        <StatCard
          label="Rapports validés"
          :value="overview.kpis.validatedReports"
          icon="i-lucide-file-check"
        />
      </section>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section
          class="lg:col-span-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5"
        >
          <h2 class="text-sm font-semibold text-[var(--ui-text)]">
            Fil d'activité
          </h2>
          <p class="text-xs text-[var(--ui-text-muted)] mt-0.5">
            Notes, retours de mission, rapports, visites, assiduité, bulletins et compétences.
          </p>

          <div class="mt-4">
            <StudentTimeline
              :items="overview.timeline"
              empty-text="Aucun événement enregistré pour cette personne."
            />
          </div>
        </section>

        <div class="space-y-6">
          <section class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5">
            <h2 class="text-sm font-semibold text-[var(--ui-text)]">
              À venir
            </h2>

            <p
              v-if="!overview.upcoming.length"
              class="text-sm text-[var(--ui-text-muted)] mt-4"
            >
              Aucune échéance planifiée.
            </p>

            <ul v-else class="mt-4 space-y-3">
              <li
                v-for="item in overview.upcoming"
                :key="item.id"
                class="flex gap-3"
              >
                <UIcon
                  :name="overviewUpcomingMeta(item.type).icon"
                  class="size-4 mt-0.5 shrink-0 text-[var(--ui-text-dimmed)]"
                />
                <div class="min-w-0">
                  <NuxtLink
                    v-if="item.link"
                    :to="item.link"
                    class="text-sm font-medium text-[var(--ui-text)] hover:underline underline-offset-4"
                  >
                    {{ item.title }}
                  </NuxtLink>
                  <span v-else class="text-sm font-medium text-[var(--ui-text)]">
                    {{ item.title }}
                  </span>
                  <p class="text-xs text-[var(--ui-text-muted)]">
                    {{ formatDateTime(item.date) }}
                  </p>
                  <p v-if="item.description" class="text-xs text-[var(--ui-text-dimmed)]">
                    {{ item.description }}
                  </p>
                </div>
              </li>
            </ul>
          </section>

          <section class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5">
            <h2 class="text-sm font-semibold text-[var(--ui-text)]">
              Accès rapides
            </h2>

            <div class="mt-4 flex flex-col gap-1">
              <UButton
                v-for="shortcut in shortcuts"
                :key="shortcut.to"
                :to="shortcut.to"
                :icon="shortcut.icon"
                color="neutral"
                variant="ghost"
                class="justify-start"
                block
              >
                {{ shortcut.label }}
              </UButton>
            </div>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  formatGrade20,
  formatPercent,
  overviewUpcomingMeta,
  type StudentOverview
} from '~/shared/utils/overview'

definePageMeta({
  middleware: ['role'],
  requireRole: 'Tutor'
})

const route = useRoute()

const { data: overview, error, status } = await useFetch<StudentOverview>(
  () => `/api/users/${route.params.id}/overview`
)

/** Répartition des missions par statut, statuts vides omis. */
const missionsHint = computed<string>(() => {
  const missions = overview.value?.kpis.missions ?? []
  const parts = missions
    .filter((mission) => mission.count > 0)
    .map((mission) => `${mission.count} ${mission.label.toLowerCase()}`)
  return parts.length > 0 ? parts.join(' · ') : 'Aucune mission assignée'
})

interface Shortcut {
  label: string
  to: string
  icon: string
}

const shortcuts = computed<Shortcut[]>(() => {
  const links = overview.value?.links
  if (!links) return []
  const items: Shortcut[] = [
    { label: "Rapports d'étape", to: links.reports, icon: 'i-lucide-file-text' },
    { label: 'Bulletins', to: links.reportCards, icon: 'i-lucide-graduation-cap' },
    { label: 'Compétences', to: links.competencies, icon: 'i-lucide-target' },
    { label: 'Visites', to: links.visits, icon: 'i-lucide-map-pin' },
    { label: 'Présences', to: '/presences', icon: 'i-lucide-calendar-check' }
  ]
  if (links.conversation) {
    items.push({ label: 'Messages', to: links.conversation, icon: 'i-lucide-mail' })
  }
  return items
})

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit'
})

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value))
}

function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value))
}
</script>
