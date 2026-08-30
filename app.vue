<template>
  <!-- `tooltip` : délai court et global pour toutes les infobulles de l'app. -->
  <UApp :tooltip="{ delayDuration: 200, skipDelayDuration: 300 }">
    <NuxtLayout :name="layoutName">
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
import { spacePrefixOf } from '~/shared/utils/auth-redirect'

// Le layout est calculé depuis le préfixe de route (ADR-0001 §3) : impossible
// d'oublier une déclaration `definePageMeta({ layout })` sur une nouvelle page.
const PUBLIC_LAYOUT_PAGES = ['/', '/features', '/login', '/register']

const route = useRoute()

const layoutName = computed<'public' | 'tuteur' | 'alternant' | 'default'>(() => {
  const space = spacePrefixOf(route.path)
  if (space === '/tuteur') return 'tuteur'
  if (space === '/alternant') return 'alternant'
  if (PUBLIC_LAYOUT_PAGES.includes(route.path)) return 'public'
  // Pages communes hors espace : /account, /notifications, /forbidden.
  return 'default'
})
</script>
