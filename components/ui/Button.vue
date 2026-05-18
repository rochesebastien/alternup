<template>
  <button 
    :class="[
      'px-4 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
      variantClasses,
      sizeClasses,
      { 'opacity-50 cursor-not-allowed': disabled }
    ]" 
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <div class="flex items-center justify-center space-x-2">
      <span v-if="loading" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span>
      <span><slot /></span>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'

const props = defineProps({
  variant: {
    type: String as PropType<'primary' | 'secondary' | 'danger' | 'outline'>,
    default: 'primary'
  },
  size: {
    type: String as PropType<'sm' | 'md' | 'lg'>,
    default: 'md'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500'
    case 'secondary':
      return 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500'
    case 'danger':
      return 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
    case 'outline':
      return 'bg-transparent border border-emerald-600 text-emerald-600 hover:bg-emerald-50 focus:ring-emerald-500'
    default:
      return 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500'
  }
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'text-xs'
    case 'md':
      return 'text-sm'
    case 'lg':
      return 'text-base px-6 py-3'
    default:
      return 'text-sm'
  }
})

defineEmits(['click'])
</script>