<template>
  <div class="min-h-[70vh] flex items-center justify-center px-4">
    <UCard class="max-w-md text-center">
      <UIcon name="i-lucide-shield-alert" class="h-12 w-12 text-[var(--ui-primary)] mx-auto" />
      <h1 class="mt-4 text-2xl font-semibold text-[var(--ui-text)]">Accès refusé</h1>
      <p class="mt-2 text-[var(--ui-text-muted)]">
        Vous n'avez pas les droits nécessaires pour consulter cette page.
      </p>
      <UButton class="mt-6" color="primary" to="/">
        Retour à l'accueil
      </UButton>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ auth: false })
</script>
