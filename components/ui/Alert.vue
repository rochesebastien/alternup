<template>
  <div :class="[baseClasses, variantClasses]">
    <div class="flex items-center">
      <div v-if="icon" class="mr-3 text-lg" :class="iconColor">
        <slot name="icon">
          <component :is="resolvedIcon" />
        </slot>
      </div>
      <div>
        <p v-if="title" class="font-medium" :class="titleClass">{{ title }}</p>
        <p :class="messageClass">
          <slot>{{ message }}</slot>
        </p>
      </div>
    </div>
    <button 
      v-if="dismissible" 
      class="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 inline-flex items-center justify-center h-8 w-8 focus:outline-none"
      :class="closeButtonClass"
      @click="$emit('dismiss')"
    >
      <span class="sr-only">Fermer</span>
      <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  message?: string
  dismissible?: boolean
  icon?: string | null
}>(), {
  variant: 'info',
  dismissible: false,
  icon: null
})

defineEmits(['dismiss'])

const baseClasses = 'p-4 mb-4 text-sm rounded-lg flex items-center justify-between'

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'info':
      return 'bg-blue-50 border border-blue-200'
    case 'success':
      return 'bg-green-50 border border-green-200'
    case 'warning':
      return 'bg-yellow-50 border border-yellow-200'
    case 'error':
      return 'bg-red-50 border border-red-200'
    default:
      return 'bg-blue-50 border border-blue-200'
  }
})

const titleClass = computed(() => {
  switch (props.variant) {
    case 'info': return 'text-blue-800'
    case 'success': return 'text-green-800'
    case 'warning': return 'text-yellow-800'
    case 'error': return 'text-red-800'
    default: return 'text-blue-800'
  }
})

const messageClass = computed(() => {
  switch (props.variant) {
    case 'info': return 'text-blue-700'
    case 'success': return 'text-green-700'
    case 'warning': return 'text-yellow-700'
    case 'error': return 'text-red-700'
    default: return 'text-blue-700'
  }
})

const iconColor = computed(() => {
  switch (props.variant) {
    case 'info': return 'text-blue-500'
    case 'success': return 'text-green-500'
    case 'warning': return 'text-yellow-500'
    case 'error': return 'text-red-500'
    default: return 'text-blue-500'
  }
})

const closeButtonClass = computed(() => {
  switch (props.variant) {
    case 'info': return 'bg-blue-50 text-blue-500 hover:bg-blue-100'
    case 'success': return 'bg-green-50 text-green-500 hover:bg-green-100'
    case 'warning': return 'bg-yellow-50 text-yellow-500 hover:bg-yellow-100'
    case 'error': return 'bg-red-50 text-red-500 hover:bg-red-100'
    default: return 'bg-blue-50 text-blue-500 hover:bg-blue-100'
  }
})

// Pour l'icône - nécessiterait normalement une bibliothèque d'icônes comme @heroicons/vue
const resolvedIcon = computed(() => {
  // Retourner un composant d'icône adapté en fonction de la variante
  return null // Pourrait être remplacé par une icône spécifique
})
</script>