<template>
  <!-- Questionnaire « une question par écran » (cf. composant Questionnaire de
       shadcn/ui) : progression, Précédent / Passer / Continuer, raccourcis
       clavier (lettres pour les choix, Entrée pour continuer), transitions
       directionnelles et focus déplacé sur la nouvelle question. La logique de
       navigation (branchement, complétude) vient de shared/utils/questionnaire.ts. -->
  <div v-if="current" class="questionnaire">
    <div class="flex items-center gap-4">
      <p
        class="min-w-[14ch] text-xs font-medium tabular-nums text-[var(--ui-text-muted)]"
        aria-live="polite"
      >
        {{ progressLabel }}
      </p>
      <div
        class="h-1 max-w-xs flex-1 overflow-hidden rounded-full bg-[var(--ui-bg-accented)]"
        role="progressbar"
        aria-label="Progression du questionnaire"
        :aria-valuemin="0"
        :aria-valuemax="progress.total"
        :aria-valuenow="progress.index"
      >
        <div
          class="h-full rounded-full bg-[var(--ui-primary)] transition-[width] duration-300 ease-out"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
    </div>

    <!-- Le formulaire capte Entrée dans les champs texte : même chemin que le
         bouton Continuer. `novalidate` : la complétude est vérifiée par `next()`. -->
    <form novalidate @submit.prevent="next">
      <Transition :name="`q-${direction}`" mode="out-in" @after-enter="focusCurrent">
        <section
          :key="current.id"
          ref="panel"
          class="mt-8"
          :aria-labelledby="`q-title-${current.id}`"
        >
          <h2
            :id="`q-title-${current.id}`"
            tabindex="-1"
            class="text-2xl font-semibold tracking-tight text-[var(--ui-text)] outline-none sm:text-3xl"
          >
            {{ current.title }}
          </h2>
          <p
            v-if="current.description"
            class="mt-3 text-base text-[var(--ui-text-muted)]"
          >
            {{ current.description }}
          </p>

          <div v-if="current.kind !== 'intro'" class="mt-8">
            <QuestionnaireChoiceGroup
              v-if="current.kind === 'single' || current.kind === 'multiple'"
              :options="current.options"
              :multiple="current.kind === 'multiple'"
              :model-value="modelValue[current.id]"
              :aria-labelledby="`q-title-${current.id}`"
              @update:model-value="setAnswer(current.id, $event)"
            />

            <div v-else class="space-y-5">
              <UFormField
                v-for="field in current.fields"
                :key="field.name"
                :label="field.label"
                :name="field.name"
                :required="field.required"
                :help="field.help"
                :error="fieldError(field)"
                size="xl"
              >
                <UInput
                  :type="field.type"
                  :model-value="textAnswer(field.name)"
                  :placeholder="field.placeholder"
                  :autocomplete="field.autocomplete"
                  :min="field.min"
                  :max="field.max"
                  size="xl"
                  class="w-full"
                  @update:model-value="setAnswer(field.name, String($event))"
                />
              </UFormField>
            </div>
          </div>

          <p v-if="error" role="alert" class="mt-4 text-sm text-[var(--ui-error)]">
            {{ error }}
          </p>
        </section>
      </Transition>

      <div class="mt-10 flex items-center justify-between gap-3">
        <UButton
          v-if="index > 0"
          type="button"
          color="neutral"
          variant="ghost"
          icon="i-lucide-arrow-left"
          label="Précédent"
          :disabled="submitting"
          @click="prev"
        />
        <span v-else />

        <div class="flex items-center gap-2">
          <UButton
            v-if="skippable"
            type="button"
            color="neutral"
            variant="ghost"
            label="Passer"
            :disabled="submitting"
            @click="skip"
          />
          <UButton
            type="submit"
            color="neutral"
            size="lg"
            :label="nextLabel"
            :trailing-icon="isLast ? 'i-lucide-check' : 'i-lucide-arrow-right'"
            :loading="submitting"
          />
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import {
  answersAfterSkip,
  fieldFormatError,
  isItemSkippable,
  itemError,
  questionProgress,
  shortcutFor,
  toggleChoice,
  visibleItems,
  type QuestionnaireAnswer,
  type QuestionnaireAnswers,
  type QuestionnaireField,
  type QuestionnaireItem
} from '~/shared/utils/questionnaire'
import { questionnaireContextKey } from '~/composables/useQuestionnaireContext'

const props = withDefaults(
  defineProps<{
    items: QuestionnaireItem[]
    /** Réponses, indexées par `item.id` ou `field.name` (voir shared/utils/questionnaire). */
    modelValue: QuestionnaireAnswers
    /** Envoi en cours : le bouton final affiche un spinner, la navigation est gelée. */
    submitting?: boolean
    submitLabel?: string
  }>(),
  { submitting: false, submitLabel: 'Terminer' }
)

const emit = defineEmits<{
  'update:modelValue': [answers: QuestionnaireAnswers]
  submit: [answers: QuestionnaireAnswers]
}>()

const visible = computed(() => visibleItems(props.items, props.modelValue))

const currentId = ref(visible.value[0]?.id ?? '')
const direction = ref<'forward' | 'back'>('forward')
const error = ref<string | null>(null)
/** Après une tentative de validation ratée, les champs obligatoires vides sont signalés. */
const attempted = ref(false)
const panel = ref<HTMLElement | null>(null)

const index = computed(() => visible.value.findIndex((item) => item.id === currentId.value))
const current = computed<QuestionnaireItem | undefined>(
  () => visible.value[index.value] ?? visible.value[0]
)
const isLast = computed(() => index.value === visible.value.length - 1)
// « Passer » sur la dernière étape n'a de sens que pour une étape optionnelle
// (une action) : ailleurs, « Terminer » sans réponse revient au même.
const skippable = computed(
  () =>
    !!current.value &&
    isItemSkippable(current.value) &&
    (!isLast.value || !!current.value.optional)
)

const progress = computed(() => questionProgress(visible.value, currentId.value))
const progressPercent = computed(() =>
  progress.value.total ? Math.round((progress.value.index / progress.value.total) * 100) : 0
)
// Rien sur l'introduction : le total dépend des réponses (branchement), il
// n'a de sens qu'une fois la première question posée.
const progressLabel = computed(() => {
  const { index: position, total } = progress.value
  return position === 0 ? '' : `Question ${position} sur ${total}`
})

const nextLabel = computed(() => {
  if (current.value?.kind === 'intro') return 'Commencer'
  return isLast.value ? props.submitLabel : 'Continuer'
})

function textAnswer(name: string): string {
  const value = props.modelValue[name]
  if (typeof value === 'number') return String(value)
  return typeof value === 'string' ? value : ''
}

function fieldError(field: QuestionnaireField): string | undefined {
  if (!attempted.value) return undefined
  const value = textAnswer(field.name)
  if (field.required && !value.trim()) return 'Ce champ est requis.'
  return fieldFormatError(field, value) ?? undefined
}

function setAnswer(key: string, value: QuestionnaireAnswer) {
  error.value = null
  // Nouvel objet à chaque réponse (jamais de mutation en place) : le parent
  // peut tenir les réponses dans un shallowRef sans rien rater.
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function goTo(position: number, dir: 'forward' | 'back') {
  goToItem(visible.value[position], dir)
}

function goToItem(target: QuestionnaireItem | undefined, dir: 'forward' | 'back') {
  if (!target) return
  direction.value = dir
  error.value = null
  attempted.value = false
  currentId.value = target.id
}

function next() {
  if (props.submitting || !current.value) return
  const problem = itemError(current.value, props.modelValue)
  if (problem) {
    attempted.value = true
    error.value = problem
    return
  }
  if (isLast.value) {
    emit('submit', props.modelValue)
    return
  }
  goTo(index.value + 1, 'forward')
}

function prev() {
  if (props.submitting) return
  goTo(index.value - 1, 'back')
}

function skip() {
  if (props.submitting || !skippable.value || !current.value) return
  // Une étape optionnelle passée est vidée : l'action qu'elle porte n'aura pas lieu.
  const answers = answersAfterSkip(current.value, props.modelValue)
  if (answers !== props.modelValue) emit('update:modelValue', answers)
  if (isLast.value) {
    emit('submit', answers)
    return
  }
  // Les réponses vidées peuvent masquer des étapes (branchement) : la suivante
  // se cherche dans la liste recalculée, pas dans l'ancienne.
  const nextVisible = visibleItems(props.items, answers)
  const position = nextVisible.findIndex((item) => item.id === current.value?.id)
  goToItem(nextVisible[position + 1], 'forward')
}

/** Après la transition, le focus va au premier champ, sinon au titre. */
function focusCurrent() {
  const root = panel.value
  if (!root) return
  const input = root.querySelector<HTMLElement>('input, textarea, select')
  const target = input ?? root.querySelector<HTMLElement>('h2[tabindex="-1"]')
  target?.focus({ preventScroll: true })
}

// Raccourcis globaux : Entrée continue (hors champ de saisie et bouton, qui
// ont leur propre comportement), une lettre active l'option correspondante.
function onKeydown(event: KeyboardEvent) {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
  const target = event.target as HTMLElement | null
  const tag = target?.tagName ?? ''
  const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!target?.isContentEditable

  if (event.key === 'Enter') {
    if (typing || tag === 'BUTTON' || tag === 'A') return
    event.preventDefault()
    next()
    return
  }

  const item = current.value
  if (typing || !item || (item.kind !== 'single' && item.kind !== 'multiple')) return
  if (event.key.length !== 1 || !/[a-z]/i.test(event.key)) return
  const letter = event.key.toUpperCase()
  const position = item.options.findIndex((_, i) => shortcutFor(i) === letter)
  if (position === -1) return
  event.preventDefault()
  const option = item.options[position]
  if (option) {
    setAnswer(item.id, toggleChoice(props.modelValue[item.id], option.value, item.kind === 'multiple'))
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

// Entrée sur une option sélectionnée (bouton focalisé) continue au lieu de
// re-basculer l'option : comportement attendu d'un questionnaire.
provide(questionnaireContextKey, { next })
</script>

<style scoped>
.q-forward-enter-active,
.q-forward-leave-active,
.q-back-enter-active,
.q-back-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.q-forward-enter-from,
.q-back-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
.q-forward-leave-to,
.q-back-enter-from {
  opacity: 0;
  transform: translateY(-16px);
}
@media (prefers-reduced-motion: reduce) {
  .q-forward-enter-active,
  .q-forward-leave-active,
  .q-back-enter-active,
  .q-back-leave-active {
    transition: none;
  }
}
</style>
