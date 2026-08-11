<script setup lang="ts">
import { Role } from '~/shared/utils/enums'

/**
 * Sélecteur d'apprenant de la barre de navigation (tuteur uniquement) : il fixe
 * la personne suivie pour toutes les pages de Suivi. Recherche intégrée, pour
 * rester utilisable avec beaucoup d'apprenants.
 */
const props = withDefaults(defineProps<{ block?: boolean }>(), { block: false })

const { isTutor, learners, focusId, focus, setFocus } = useLearnerFocus()

const ROLE_LABELS: Record<string, string> = {
  [Role.Alternant]: 'Alternant',
  [Role.Stagiaire]: 'Stagiaire'
}

// Valeur sentinelle : `USelectMenu` ne sait pas porter « aucune sélection »
// comme une option à part entière.
const ALL = '__all__'

const items = computed(() => [
  [{ label: 'Tous les apprenants', value: ALL, icon: 'i-lucide-users' }],
  learners.value.map((l) => ({
    label: `${l.firstName} ${l.lastName}`,
    value: l.id,
    description: ROLE_LABELS[l.role] ?? l.role
  }))
])

const selected = computed<string>({
  get: () => (focus.value ? focus.value.id : ALL),
  set: (value: string) => setFocus(value === ALL ? null : value)
})

const initials = computed<string>(() =>
  focus.value
    ? `${focus.value.firstName.charAt(0)}${focus.value.lastName.charAt(0)}`.toUpperCase()
    : ''
)

// Un tuteur sans aucun apprenant n'a rien à filtrer : on n'affiche rien plutôt
// qu'un sélecteur vide.
const visible = computed<boolean>(() => isTutor.value && learners.value.length > 0)

// Une sélection devenue caduque (apprenant retiré) est nettoyée.
watch(learners, (list) => {
  if (focusId.value && list.length && !list.some((l) => l.id === focusId.value)) {
    setFocus(null)
  }
})
</script>

<template>
  <USelectMenu
    v-if="visible"
    v-model="selected"
    value-key="value"
    :items="items"
    color="neutral"
    variant="outline"
    size="sm"
    :search-input="{ placeholder: 'Rechercher un apprenant…' }"
    :aria-label="focus ? `Apprenant suivi : ${focus.firstName} ${focus.lastName}` : 'Choisir un apprenant à suivre'"
    :class="props.block ? 'w-full' : 'w-44 xl:w-52'"
    :ui="{ base: 'rounded-md' }"
  >
    <template #leading>
      <span
        v-if="focus"
        class="size-5 shrink-0 rounded-full bg-[var(--ui-bg-inverted)] text-[var(--ui-text-inverted)] text-[10px] font-semibold flex items-center justify-center"
        aria-hidden="true"
      >
        {{ initials }}
      </span>
      <UIcon v-else name="i-lucide-users" class="size-4 text-[var(--ui-text-dimmed)]" />
    </template>
  </USelectMenu>
</template>
