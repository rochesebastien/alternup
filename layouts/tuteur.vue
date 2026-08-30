<template>
  <!-- Shell de l'espace tuteur (/tuteur/*) : la nav n'affiche que les modules
       tuteur, la route porte le rôle (plus de v-if isTutor). -->
  <AppShell dock>
    <template #links="{ navLinkClass }">
      <NuxtLink to="/tuteur/dashboard" :class="navLinkClass('/tuteur/dashboard')">
        Tableau de bord
      </NuxtLink>
      <NuxtLink to="/tuteur/alternants" :class="navLinkClass('/tuteur/alternants')">
        Alternants
      </NuxtLink>
      <NuxtLink to="/tuteur/projects" :class="navLinkClass('/tuteur/projects')">
        Projets
      </NuxtLink>
      <NuxtLink to="/tuteur/calendar" :class="navLinkClass('/tuteur/calendar')">
        Calendrier
      </NuxtLink>
      <!-- Les pages de Suivi et le choix de l'apprenant vivent
           dans le dock apprenant (coin bas-droit). -->
    </template>

    <template #mobile-links="{ close, linkClass }">
      <NuxtLink to="/tuteur/dashboard" :class="linkClass" @click="close">Tableau de bord</NuxtLink>
      <NuxtLink to="/tuteur/alternants" :class="linkClass" @click="close">Alternants</NuxtLink>
      <NuxtLink to="/tuteur/projects" :class="linkClass" @click="close">Projets</NuxtLink>
      <NuxtLink to="/tuteur/calendar" :class="linkClass" @click="close">Calendrier</NuxtLink>
      <!-- Même sélecteur qu'en desktop : il pilote les pages de Suivi listées juste après. -->
      <LearnerFocusSwitcher block class="my-1" />
      <NuxtLink to="/tuteur/presences" :class="linkClass" @click="close">Présences</NuxtLink>
      <NuxtLink to="/tuteur/rapports" :class="linkClass" @click="close">Rapports</NuxtLink>
      <NuxtLink to="/tuteur/annonces" :class="linkClass" @click="close">Annonces</NuxtLink>
      <NuxtLink to="/tuteur/bulletins" :class="linkClass" @click="close">Bulletins</NuxtLink>
      <NuxtLink to="/tuteur/competences" :class="linkClass" @click="close">Compétences</NuxtLink>
      <NuxtLink to="/tuteur/visites" :class="linkClass" @click="close">Visites</NuxtLink>
      <NuxtLink to="/tuteur/messages" :class="linkClass" @click="close">Messages</NuxtLink>
      <NuxtLink to="/notifications" class="flex items-center gap-2 text-[var(--ui-text-muted)] hover:text-[var(--ui-text)] transition-colors" @click="close">
        Notifications
        <span
          v-if="notificationCount > 0"
          class="min-w-4 h-4 px-1 rounded-full bg-[var(--ui-error)] text-white text-[10px] font-semibold leading-4 text-center"
        >
          {{ notificationCount > 99 ? '99+' : notificationCount }}
        </span>
      </NuxtLink>
    </template>

    <slot />
  </AppShell>
</template>

<script setup lang="ts">
// Compteur du centre de notifications, alimenté par <NotificationBell /> (nav
// desktop) et réutilisé tel quel dans le menu mobile — aucune requête en double.
const notificationCount = useNotificationCountState()
</script>
