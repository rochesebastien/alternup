<template>
  <div class="w-full px-6 py-10 space-y-6">
    <div
      v-if="status === 'pending'"
      class="flex justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="animate-spin h-6 w-6 text-[var(--ui-text-dimmed)]"
      />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      :title="error.statusMessage ?? 'Chargement impossible'"
      description="Votre synthèse d'évolution n'a pas pu être chargée. Réessayez plus tard."
    />

    <template v-else-if="overview">
      <PageHeader
        title="Mon évolution"
        subtitle="La synthèse de votre progression : notes, missions, compétences et rapports."
      />

      <p
        v-if="overview.student.addedAt"
        class="-mt-2 text-sm text-[var(--ui-text-muted)]"
      >
        Suivi par votre tuteur depuis le {{ formatDate(overview.student.addedAt) }}.
      </p>

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
            Vos notes, retours de mission, rapports, visites, assiduité, bulletins et compétences.
          </p>

          <div class="mt-4">
            <StudentTimeline
              :items="overview.timeline"
              empty-text="Aucun événement enregistré pour le moment."
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

            <ul
              v-else
              class="mt-4 space-y-3"
            >
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
                  <span
                    v-else
                    class="text-sm font-medium text-[var(--ui-text)]"
                  >
                    {{ item.title }}
                  </span>
                  <p class="text-xs text-[var(--ui-text-muted)]">
                    {{ formatDateTime(item.date) }}
                  </p>
                  <p
                    v-if="item.description"
                    class="text-xs text-[var(--ui-text-dimmed)]"
                  >
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

// « Mon évolution » réutilise la fiche synthétique servie au tuteur :
// /api/users/[id]/overview autorise déjà l'apprenant à consulter sa propre
// fiche (assertCanViewStudent) et préfixe les liens selon l'espace (/alternant).
const { user } = useUserSession()

const { data: overview, error, status } = await useFetch<StudentOverview>(
  () => `/api/users/${user.value?.id}/overview`,
  { immediate: !!user.value?.id }
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
    { label: 'Présences', to: '/alternant/presences', icon: 'i-lucide-calendar-check' }
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
