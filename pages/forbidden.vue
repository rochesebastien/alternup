<template>
  <div class="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 space-y-4">
    <p class="text-6xl font-bold text-emerald-600">403</p>
    <h1 class="text-2xl font-semibold text-gray-900">Accès refusé</h1>
    <p class="text-gray-600 max-w-md">
      Vous n'avez pas les droits nécessaires pour consulter cette page.
    </p>
    <NuxtLink
      to="/"
      class="inline-block py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md"
    >
      Retour à l'accueil
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ auth: false, layout: false })
</script>
