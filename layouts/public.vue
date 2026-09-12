<template>
  <!-- Landing / marketing / authentification : nav publique, pleine largeur,
       footer marketing sur les pages vitrines. -->
  <AppShell full-bleed :marketing-footer="isMarketing">
    <template #links="{ navLinkClass }">
      <NuxtLink to="/#product_anchor" :class="navLinkClass()">Produit</NuxtLink>
      <!-- Pas d'état actif : « Produit » (ancre de la landing) n'en a pas non
           plus, un seul lien surligné sur deux détonnait. -->
      <NuxtLink to="/features" :class="navLinkClass()">Fonctionnalités</NuxtLink>
    </template>

    <template #mobile-links="{ close, linkClass }">
      <NuxtLink to="/#product_anchor" :class="linkClass" @click="close">Produit</NuxtLink>
      <NuxtLink to="/features" :class="linkClass" @click="close">Fonctionnalités</NuxtLink>
    </template>

    <slot />
  </AppShell>
</template>

<script setup lang="ts">
const route = useRoute()

// Footer marketing complet uniquement sur les pages vitrines (landing, features).
const isMarketing = computed(() => ['/', '/features'].includes(route.path))
</script>
