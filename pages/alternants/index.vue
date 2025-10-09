<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8 flex items-center justify-between">
      <h1 class="text-3xl font-bold text-gray-900">Alternants</h1>
      <UiButton variant="primary">
        Ajouter un alternant
      </UiButton>
    </div>
    
    <!-- Filtres et recherche -->
    <div class="bg-white shadow-md rounded-lg p-4 mb-6">
      <div class="flex flex-wrap gap-4 items-center">
        <div class="flex-grow">
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Rechercher un alternant..." 
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            @input="debounceSearch"
          />
        </div>
        <div>
          <select 
            v-model="formationFilter" 
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            @change="loadAlternants(1)"
          >
            <option value="">Toutes les formations</option>
            <option value="BTS SIO">BTS SIO</option>
            <option value="BUT Informatique">BUT Informatique</option>
            <option value="Master MIAGE">Master MIAGE</option>
            <option value="Ingénieur informatique">Ingénieur informatique</option>
          </select>
        </div>
        <div>
          <UiButton 
            variant="outline" 
            size="sm" 
            @click="resetFilters"
          >
            Réinitialiser
          </UiButton>
        </div>
      </div>
    </div>
    
    <!-- Liste des alternants -->
    <AlternantsList :loading="loading" :alternants="alternants" :error="error" @view="viewAlternant" />
    
    <!-- Pagination -->
    <div v-if="pagination && pagination.totalPages > 1" class="mt-6 flex justify-center">
      <nav class="flex items-center space-x-2">
        <button
          type="button"
          class="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50"
          :disabled="currentPage === 1"
          @click="loadAlternants(currentPage - 1)"
        >
          <span class="sr-only">Précédent</span>
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <template v-for="page in displayedPages" :key="page">
          <button
            v-if="page !== '...'"
            type="button"
            class="px-4 py-2 rounded-md border"
            :class="page === currentPage 
              ? 'bg-emerald-600 text-white border-emerald-600' 
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'"
            @click="loadAlternants(page)"
          >
            {{ page }}
          </button>
          <span v-else class="px-2 py-1 text-gray-500">{{ page }}</span>
        </template>
        
        <button
          type="button"
          class="p-2 rounded-md border border-gray-300 text-gray-500 hover:bg-gray-50"
          :disabled="currentPage === pagination.totalPages"
          @click="loadAlternants(currentPage + 1)"
        >
          <span class="sr-only">Suivant</span>
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Alternant } from '~/types/supabase'

const router = useRouter()

// États
const alternants = ref<Alternant[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const searchQuery = ref('')
const formationFilter = ref('')
const currentPage = ref(1)
const pagination = ref<{
  total: number
  page: number
  pageSize: number
  totalPages: number
} | null>(null)

// Recherche avec debounce
let debounceTimeout: ReturnType<typeof setTimeout>
function debounceSearch() {
  clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    loadAlternants(1)
  }, 500)
}

// Pages affichées dans la pagination
const displayedPages = computed(() => {
  if (!pagination.value) return []
  
  const totalPages = pagination.value.totalPages
  const current = currentPage.value
  const pages: (number | string)[] = []
  
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    pages.push(1)
    
    if (current > 3) {
      pages.push('...')
    }
    
    const start = Math.max(2, current - 1)
    const end = Math.min(totalPages - 1, current + 1)
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    
    if (current < totalPages - 2) {
      pages.push('...')
    }
    
    pages.push(totalPages)
  }
  
  return pages
})

// Charger les alternants
async function loadAlternants(page: number) {
  loading.value = true
  error.value = null
  currentPage.value = page
  
  try {
    // Construire l'URL avec les paramètres
    const limit = 10
    const offset = (page - 1) * limit
    
    let url = `/api/alternants?limit=${limit}&offset=${offset}`
    
    if (searchQuery.value) {
      url += `&search=${encodeURIComponent(searchQuery.value)}`
    }
    
    if (formationFilter.value) {
      url += `&formation=${encodeURIComponent(formationFilter.value)}`
    }
    
    // Appel à l'API interne
    const response = await $fetch(url)
    
    if (!response.success) {
      throw new Error(response.error || 'Erreur lors de la récupération des alternants')
    }
    
    alternants.value = response.data
    pagination.value = response.pagination
    
  } catch (e: any) {
    console.error('Erreur:', e)
    error.value = e.message || 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}

// Réinitialiser les filtres
function resetFilters() {
  searchQuery.value = ''
  formationFilter.value = ''
  loadAlternants(1)
}

// Voir les détails d'un alternant
function viewAlternant(id: string) {
  router.push(`/alternants/${id}`)
}

// Chargement initial
onMounted(() => {
  loadAlternants(1)
})
</script>