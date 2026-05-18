<template>
  <div class="bg-white shadow-md rounded-lg overflow-hidden">
    <div class="p-6">
      <h2 class="text-xl font-semibold text-gray-800 mb-4">Liste des alternants</h2>

      <div v-if="loading" class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-md p-4">
        <p class="text-red-600">{{ error }}</p>
      </div>

      <div v-else-if="alternants.length === 0" class="bg-gray-50 border rounded-md p-4">
        <p class="text-center text-gray-600">Aucun alternant trouvé</p>
      </div>

      <div v-else>
        <ul class="divide-y divide-gray-200">
          <li
            v-for="alternant in alternants"
            :key="alternant.id"
            class="py-4 hover:bg-gray-50 transition-colors cursor-pointer"
            @click="$emit('view', alternant.id)"
          >
            <div class="flex items-center space-x-4">
              <div class="flex-shrink-0">
                <div class="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span class="text-emerald-600 font-medium">{{ getInitials(alternant.firstName, alternant.lastName) }}</span>
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">
                  {{ alternant.firstName }} {{ alternant.lastName }}
                </p>
                <p class="text-sm text-gray-500 truncate">
                  {{ alternant.email }}
                </p>
                <p class="text-xs text-gray-400 truncate mt-1">
                  {{ alternant.role }}
                </p>
              </div>
              <div class="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-800">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface AlternantListItem {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

defineProps<{
  alternants: AlternantListItem[]
  loading: boolean
  error: string | null
}>()

defineEmits<{
  (e: 'view', id: string): void
}>()

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}
</script>
