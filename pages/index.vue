<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
    <div class="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
      <h1 class="text-3xl font-bold text-center text-emerald-600 mb-6">Bienvenue sur Alternup</h1>
      
      <div class="bg-emerald-50 border border-emerald-200 rounded-md p-4 mb-6">
        <div class="flex items-center">
          <div class="mr-3 text-emerald-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p>Connexion Supabase établie avec succès</p>
        </div>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div class="bg-gray-50 border rounded-md p-4">
          <h2 class="font-semibold mb-2">Fonctionnalités</h2>
          <ul class="list-disc list-inside text-sm space-y-1">
            <li>Gestion des alternants</li>
            <li>Suivi des compétences</li>
            <li>Création de quiz</li>
            <li>Tableau de bord personnalisé</li>
          </ul>
        </div>
        <div class="bg-gray-50 border rounded-md p-4">
          <h2 class="font-semibold mb-2">Technologies</h2>
          <ul class="list-disc list-inside text-sm space-y-1">
            <li>NuxtJS Monolithe</li>
            <li>Supabase (Base de données)</li>
            <li>Tailwind CSS (UI)</li>
            <li>TypeScript (Typage)</li>
          </ul>
        </div>
      </div>
      
      <div class="flex justify-center">
        <NuxtLink to="/alternants" class="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-md transition-colors">
          Commencer
        </NuxtLink>
      </div>
    </div>
  </div>
</template>