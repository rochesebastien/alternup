<template>
  <!-- Liste d'options d'une question à choix unique (radiogroup) ou multiple
       (group de cases). Chaque option porte un raccourci clavier A, B, C… -->
  <div
    :role="multiple ? 'group' : 'radiogroup'"
    :aria-labelledby="ariaLabelledby"
    class="grid gap-2"
  >
    <QuestionnaireChoice
      v-for="(option, i) in options"
      :key="option.value"
      :label="option.label"
      :description="option.description"
      :icon="option.icon"
      :shortcut="shortcutFor(i)"
      :multiple="multiple"
      :selected="isSelected(option.value)"
      @select="onSelect(option.value)"
    />
  </div>
</template>

<script setup lang="ts">
import {
  shortcutFor,
  toggleChoice,
  type QuestionnaireAnswer,
  type QuestionnaireOption
} from '~/shared/utils/questionnaire'

const props = withDefaults(
  defineProps<{
    options: QuestionnaireOption[]
    modelValue: QuestionnaireAnswer
    multiple?: boolean
    ariaLabelledby?: string
  }>(),
  { multiple: false, ariaLabelledby: undefined }
)

const emit = defineEmits<{ 'update:modelValue': [value: string | string[]] }>()

function isSelected(value: string): boolean {
  const current = props.modelValue
  return Array.isArray(current) ? current.includes(value) : current === value
}

function onSelect(value: string) {
  emit('update:modelValue', toggleChoice(props.modelValue, value, props.multiple))
}
</script>
