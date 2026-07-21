<template>
  <div class="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
    <div class="max-w-sm text-center">
      <p class="text-sm font-medium text-[var(--ui-text-dimmed)]">Erreur 403</p>
      <h1 class="mt-2 text-2xl font-semibold tracking-tight text-[var(--ui-text)]">Accès refusé</h1>
      <p class="mt-2 text-sm text-[var(--ui-text-muted)]">
        Vous n'avez pas les droits nécessaires pour consulter cette page.
      </p>
      <UButton class="mt-6" color="neutral" icon="i-lucide-arrow-left" to="/">
        Retour à l'accueil
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ auth: false })
</script>
