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

    <div v-if="status === 'pending'" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
    </div>

    <UiAlert
      v-else-if="error"
      variant="error"
      title="Erreur"
      :message="error.message"
    />

    <div v-else-if="alternant" class="bg-white shadow-lg rounded-lg overflow-hidden">
      <div class="bg-emerald-600 text-white p-6">
        <h1 class="text-2xl font-bold">{{ alternant.firstName }} {{ alternant.lastName }}</h1>
        <p class="text-emerald-100 text-lg">{{ alternant.role }}</p>
      </div>

      <div class="p-6 border-b">
        <h2 class="text-lg font-semibold text-gray-800 mb-4">Contact</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-500">Email</p>
            <p class="text-gray-800">{{ alternant.email }}</p>
          </div>
        </div>
      </div>

      <div class="p-6 text-sm text-gray-500">
        <p>Créé le {{ formatDate(alternant.createdAt) }}</p>
        <p>Dernière mise à jour le {{ formatDate(alternant.updatedAt) }}</p>
      </div>
    </div>

    <UiAlert
      v-else
      variant="warning"
      title="Alternant introuvable"
      message="Impossible de trouver les informations de l'alternant demandé."
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['role'],
  requireRole: 'Tutor'
})

interface AlternantDetail {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  createdAt: string
  updatedAt: string
}

const route = useRoute()

const { data: alternant, error, status } = await useFetch<AlternantDetail>(
  () => `/api/alternants/${route.params.id}`
)

function formatDate(dateStr?: string) {
  if (!dateStr) return 'Non renseigné'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(dateStr))
}
</script>
