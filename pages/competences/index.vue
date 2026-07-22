<script setup lang="ts">
import type { CompetencyLevel } from '@prisma/client'
import { Role } from '@prisma/client'
import { COMPETENCY_LEVEL_OPTIONS } from '~/shared/utils/competencies'

definePageMeta({})

const { user } = useUserSession()
const isTutor = computed<boolean>(() => user.value?.role === Role.Tutor)
const toast = useToast()

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

interface FrameworkCompetency {
  id: string
  label: string
}

interface FrameworkDomain {
  id: string
  label: string
  competencies: FrameworkCompetency[]
}

interface Learner {
  id: string
  firstName: string
  lastName: string
}

const emptyMap = (): CompetencyMap => ({ domains: [], overall: null })

function readErrorMessage(err: unknown): string | null {
  const e = err as {
    statusMessage?: string
    data?: { statusMessage?: string; issues?: Array<{ message: string }> }
  }
  return (
    e.data?.statusMessage ||
    e.data?.issues?.[0]?.message ||
    e.statusMessage ||
    null
  )
}

// --- Alternant / Stagiaire --------------------------------------------------
const { data: learnerMap } = await useFetch<CompetencyMap>(
  () => `/api/users/${user.value?.id ?? ''}/competencies`,
  {
    default: emptyMap,
    immediate: !isTutor.value && !!user.value?.id
  }
)

const learnerOverall = computed<string>(() => {
  const o = learnerMap.value?.overall
  return o != null ? `${o}%` : '—'
})

// --- Tuteur : référentiel ---------------------------------------------------
const { data: framework, refresh: refreshFramework } = await useFetch<FrameworkDomain[]>(
  '/api/competency-framework',
  {
    default: () => [],
    immediate: isTutor.value
  }
)

const newDomainLabel = ref<string>('')
const domainPending = ref<boolean>(false)
const newCompetencyLabel = reactive<Record<string, string>>({})
const competencyPending = reactive<Record<string, boolean>>({})

async function addDomain() {
  const label = newDomainLabel.value.trim()
  if (!label) return
  domainPending.value = true
  try {
    await $fetch('/api/competency-domains', { method: 'POST', body: { label } })
    newDomainLabel.value = ''
    toast.add({ title: 'Domaine ajouté', color: 'success' })
    await refreshFramework()
  } catch (err: unknown) {
    toast.add({
      title: readErrorMessage(err) ?? "Impossible d'ajouter le domaine.",
      color: 'error'
    })
  } finally {
    domainPending.value = false
  }
}

async function removeDomain(id: string) {
  try {
    await $fetch(`/api/competency-domains/${id}`, { method: 'DELETE' })
    toast.add({ title: 'Domaine supprimé', color: 'success' })
    await refreshFramework()
  } catch (err: unknown) {
    toast.add({
      title: readErrorMessage(err) ?? 'Impossible de supprimer le domaine.',
      color: 'error'
    })
  }
}

async function addCompetency(domainId: string) {
  const label = (newCompetencyLabel[domainId] ?? '').trim()
  if (!label) return
  competencyPending[domainId] = true
  try {
    await $fetch('/api/competencies', {
      method: 'POST',
      body: { domainId, label }
    })
    newCompetencyLabel[domainId] = ''
    toast.add({ title: 'Compétence ajoutée', color: 'success' })
    await refreshFramework()
  } catch (err: unknown) {
    toast.add({
      title: readErrorMessage(err) ?? "Impossible d'ajouter la compétence.",
      color: 'error'
    })
  } finally {
    competencyPending[domainId] = false
  }
}

async function removeCompetency(id: string) {
  try {
    await $fetch(`/api/competencies/${id}`, { method: 'DELETE' })
    toast.add({ title: 'Compétence supprimée', color: 'success' })
    await refreshFramework()
  } catch (err: unknown) {
    toast.add({
      title: readErrorMessage(err) ?? 'Impossible de supprimer la compétence.',
      color: 'error'
    })
  }
}

// --- Tuteur : évaluation ----------------------------------------------------
const { data: learners } = await useFetch<Learner[]>(
  () => `/api/tutors/${user.value?.id ?? '_'}/learners`,
  {
    default: () => [],
    immediate: isTutor.value
  }
)

const learnerItems = computed<Array<{ label: string; value: string }>>(() =>
  (learners.value ?? []).map((l) => ({
    label: `${l.firstName} ${l.lastName}`,
    value: l.id
  }))
)

const selectedId = ref<string | undefined>(undefined)

const {
  data: evalMap,
  pending: evalPending,
  refresh: refreshEval
} = await useFetch<CompetencyMap>(
  () => (selectedId.value ? `/api/users/${selectedId.value}/competencies` : ''),
  {
    default: emptyMap,
    immediate: false
  }
)

watch(selectedId, (id) => {
  if (id) refreshEval()
})

const assessPending = reactive<Record<string, boolean>>({})

async function assess(competencyId: string, level: CompetencyLevel) {
  if (!selectedId.value) return
  assessPending[competencyId] = true
  try {
    await $fetch('/api/competency-assessments', {
      method: 'POST',
      body: { competencyId, studentId: selectedId.value, level }
    })
    toast.add({ title: 'Évaluation enregistrée', color: 'success' })
    await refreshEval()
  } catch (err: unknown) {
    toast.add({
      title: readErrorMessage(err) ?? "Impossible d'enregistrer l'évaluation.",
      color: 'error'
    })
  } finally {
    assessPending[competencyId] = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-6 py-10 space-y-6">
    <!-- ================= Vue Alternant / Stagiaire ================= -->
    <template v-if="!isTutor">
      <PageHeader
        title="Mes compétences"
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
            {{ domain.progress != null ? domain.progress + '%' : '—' }}
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
    </template>

    <!-- ================= Vue Tuteur ================= -->
    <template v-else>
      <PageHeader title="Compétences" subtitle="Référentiel et évaluation." />

      <!-- Bloc Référentiel -->
      <section class="space-y-4">
        <h2 class="text-base font-semibold text-[var(--ui-text)]">Référentiel</h2>

        <div
          v-if="(framework?.length ?? 0) === 0"
          class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
        >
          Aucun domaine défini. Ajoutez-en un ci-dessous.
        </div>

        <div
          v-for="domain in framework ?? []"
          :key="domain.id"
          class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5 space-y-4"
        >
          <div class="flex items-center justify-between gap-4">
            <h3 class="text-base font-semibold text-[var(--ui-text)]">
              {{ domain.label }}
            </h3>
            <UButton
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              size="xs"
              aria-label="Supprimer le domaine"
              @click="removeDomain(domain.id)"
            />
          </div>

          <ul class="space-y-2">
            <li
              v-for="c in domain.competencies"
              :key="c.id"
              class="flex items-center justify-between gap-4"
            >
              <span class="text-sm text-[var(--ui-text)]">{{ c.label }}</span>
              <UButton
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                size="xs"
                aria-label="Supprimer la compétence"
                @click="removeCompetency(c.id)"
              />
            </li>
            <li
              v-if="domain.competencies.length === 0"
              class="text-sm text-[var(--ui-text-muted)]"
            >
              Aucune compétence dans ce domaine.
            </li>
          </ul>

          <div class="flex items-center gap-2 pt-1">
            <UInput
              v-model="newCompetencyLabel[domain.id]"
              placeholder="Nouvelle compétence…"
              class="flex-1"
              @keydown.enter="addCompetency(domain.id)"
            />
            <UButton
              color="neutral"
              :loading="competencyPending[domain.id]"
              @click="addCompetency(domain.id)"
            >
              Ajouter
            </UButton>
          </div>
        </div>

        <div
          class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5"
        >
          <p
            class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide mb-3"
          >
            Ajouter un domaine
          </p>
          <div class="flex items-center gap-2">
            <UInput
              v-model="newDomainLabel"
              placeholder="Nom du domaine…"
              class="flex-1"
              @keydown.enter="addDomain"
            />
            <UButton color="neutral" :loading="domainPending" @click="addDomain">
              Ajouter
            </UButton>
          </div>
        </div>
      </section>

      <!-- Bloc Évaluation -->
      <section class="space-y-4">
        <h2 class="text-base font-semibold text-[var(--ui-text)]">Évaluation</h2>

        <div
          class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5 space-y-4"
        >
          <UFormField label="Alternant">
            <USelectMenu
              v-model="selectedId"
              value-key="value"
              :items="learnerItems"
              placeholder="Sélectionner un alternant…"
              class="w-full"
            />
          </UFormField>

          <div
            v-if="!selectedId"
            class="text-sm text-[var(--ui-text-muted)]"
          >
            Choisissez un alternant pour évaluer ses compétences.
          </div>

          <template v-else>
            <div
              v-if="evalPending"
              class="text-sm text-[var(--ui-text-muted)]"
            >
              Chargement…
            </div>

            <div
              v-else-if="(evalMap?.domains.length ?? 0) === 0"
              class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
            >
              Aucun domaine dans le référentiel.
            </div>

            <div
              v-for="domain in evalMap?.domains ?? []"
              v-else
              :key="domain.id"
              class="space-y-3"
            >
              <h3 class="text-sm font-semibold text-[var(--ui-text)]">
                {{ domain.label }}
              </h3>
              <div
                v-for="c in domain.competencies"
                :key="c.id"
                class="flex items-center justify-between gap-4"
              >
                <span class="text-sm text-[var(--ui-text)]">{{ c.label }}</span>
                <USelect
                  :items="COMPETENCY_LEVEL_OPTIONS"
                  value-key="value"
                  :model-value="(c.level ?? undefined) as CompetencyLevel | undefined"
                  :loading="assessPending[c.id]"
                  placeholder="Niveau…"
                  class="w-44"
                  @update:model-value="(lvl: CompetencyLevel) => assess(c.id, lvl)"
                />
              </div>
            </div>
          </template>
        </div>
      </section>
    </template>
  </div>
</template>
