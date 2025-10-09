<template>
  <div class="container mx-auto px-4 py-8">
    <div class="flex items-center mb-6 space-x-2">
      <NuxtLink 
        to="/alternants"
        class="text-emerald-600 hover:text-emerald-700 flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Retour à la liste
      </NuxtLink>
    </div>
    
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
    </div>
    
    <template v-else-if="error">
      <UiAlert variant="error" title="Erreur" :message="error" />
    </template>
    
    <template v-else-if="alternant">
      <div class="bg-white shadow-lg rounded-lg overflow-hidden">
        <!-- En-tête -->
        <div class="bg-emerald-600 text-white p-6">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 class="text-2xl font-bold">{{ alternant.prenom }} {{ alternant.nom }}</h1>
              <p class="text-emerald-100 text-lg">{{ alternant.formation }}</p>
            </div>
            <div class="mt-4 md:mt-0 flex space-x-3">
              <UiButton variant="outline" size="sm" class="text-white border-white hover:bg-emerald-700">
                Modifier
              </UiButton>
              <UiButton variant="outline" size="sm" class="text-white border-white hover:bg-emerald-700">
                Supprimer
              </UiButton>
            </div>
          </div>
        </div>
        
        <!-- Informations de contact -->
        <div class="p-6 border-b">
          <h2 class="text-lg font-semibold text-gray-800 mb-4">Contact</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-500">Email</p>
              <p class="text-gray-800">{{ alternant.email }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">Téléphone</p>
              <p class="text-gray-800">{{ alternant.telephone || 'Non renseigné' }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">Date de naissance</p>
              <p class="text-gray-800">{{ formatDate(alternant.date_naissance) }}</p>
            </div>
          </div>
        </div>
        
        <!-- Compétences -->
        <div class="p-6 border-b">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold text-gray-800">Compétences</h2>
            <UiButton variant="outline" size="sm">
              Ajouter
            </UiButton>
          </div>
          
          <div v-if="alternant.competences && alternant.competences.length > 0" class="space-y-3">
            <div
              v-for="(comp, index) in alternant.competences"
              :key="index"
              class="bg-gray-50 border border-gray-200 rounded-md p-3"
            >
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="font-medium text-gray-900">{{ comp.nom }}</h3>
                  <p class="text-sm text-gray-600 mt-1">{{ comp.description }}</p>
                </div>
                <div class="flex items-center">
                  <span 
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    :class="getCompetenceNiveauClass(comp.niveau)"
                  >
                    {{ getCompetenceNiveauLabel(comp.niveau) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div v-else class="text-center py-6 bg-gray-50 rounded-md">
            <p class="text-gray-500">Aucune compétence enregistrée</p>
          </div>
        </div>
        
        <!-- Notes -->
        <div class="p-6 border-b">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold text-gray-800">Notes</h2>
            <UiButton variant="outline" size="sm">
              Ajouter
            </UiButton>
          </div>
          
          <div v-if="alternant.notes && alternant.notes.length > 0" class="space-y-4">
            <div
              v-for="(note, index) in alternant.notes"
              :key="index"
              class="bg-gray-50 border border-gray-200 rounded-md p-4"
            >
              <div class="flex justify-between">
                <h4 class="font-medium">{{ note.titre }}</h4>
                <span class="text-xs text-gray-500">{{ formatDate(note.date) }}</span>
              </div>
              <p class="mt-2 text-gray-700">{{ note.contenu }}</p>
            </div>
          </div>
          
          <div v-else class="text-center py-6 bg-gray-50 rounded-md">
            <p class="text-gray-500">Aucune note enregistrée</p>
          </div>
        </div>
        
        <!-- Informations système -->
        <div class="p-6 text-sm text-gray-500">
          <p>Créé le {{ formatDate(alternant.created_at) }}</p>
          <p>Dernière mise à jour le {{ formatDate(alternant.updated_at) }}</p>
        </div>
      </div>
    </template>
    
    <template v-else>
      <UiAlert 
        variant="warning" 
        title="Alternant introuvable" 
        message="Impossible de trouver les informations de l'alternant demandé." 
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Alternant } from '~/types/supabase'

const route = useRoute()

// États
const alternant = ref<Alternant | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// Récupération de l'alternant par ID
async function fetchAlternant() {
  loading.value = true
  error.value = null
  
  try {
    const alternantId = route.params.id
    
    if (!alternantId) {
      throw new Error('ID de l\'alternant non spécifié')
    }
    
    const response = await $fetch(`/api/alternants/${alternantId}`)
    
    if (!response.success) {
      throw new Error(response.error || 'Erreur lors de la récupération de l\'alternant')
    }
    
    alternant.value = response.data
    
  } catch (e: any) {
    console.error('Erreur:', e)
    error.value = e.message || 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}

// Formater une date
function formatDate(dateStr?: string) {
  if (!dateStr) return 'Non renseigné'
  
  try {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date)
  } catch (e) {
    return 'Date invalide'
  }
}

// Obtenir la classe CSS pour le niveau de compétence
function getCompetenceNiveauClass(niveau?: number) {
  if (!niveau && niveau !== 0) return 'bg-gray-100 text-gray-800'
  
  switch (niveau) {
    case 1:
      return 'bg-red-100 text-red-800'
    case 2:
      return 'bg-orange-100 text-orange-800'
    case 3:
      return 'bg-yellow-100 text-yellow-800'
    case 4:
      return 'bg-green-100 text-green-800'
    case 5:
      return 'bg-emerald-100 text-emerald-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// Obtenir le libellé pour le niveau de compétence
function getCompetenceNiveauLabel(niveau?: number) {
  if (!niveau && niveau !== 0) return 'Non évalué'
  
  switch (niveau) {
    case 1:
      return 'Notions'
    case 2:
      return 'Débutant'
    case 3:
      return 'Intermédiaire'
    case 4:
      return 'Avancé'
    case 5:
      return 'Expert'
    default:
      return 'Non évalué'
  }
}

// Chargement initial
onMounted(() => {
  fetchAlternant()
})
</script>