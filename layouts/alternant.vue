<template>
  <!-- Shell de l'espace apprenant (/alternant/*, Alternant et Stagiaire) : la
       nav n'affiche que les modules apprenants, la route porte le rôle. -->
  <AppShell dock>
    <template #links="{ navLinkClass }">
      <NuxtLink to="/alternant/dashboard" :class="navLinkClass('/alternant/dashboard')">
        Tableau de bord
      </NuxtLink>
      <NuxtLink to="/alternant/courses" :class="navLinkClass('/alternant/courses')">
        Cours
      </NuxtLink>
      <NuxtLink to="/alternant/missions" :class="navLinkClass('/alternant/missions')">
        Missions
      </NuxtLink>
      <NuxtLink to="/alternant/calendar" :class="navLinkClass('/alternant/calendar')">
        Calendrier
      </NuxtLink>
      <!-- Les pages de Suivi vivent dans le dock apprenant (coin bas-droit). -->
    </template>

    <template #mobile-links="{ close, linkClass }">
      <NuxtLink to="/alternant/dashboard" :class="linkClass" @click="close">Tableau de bord</NuxtLink>
      <NuxtLink to="/alternant/courses" :class="linkClass" @click="close">Cours</NuxtLink>
      <NuxtLink to="/alternant/missions" :class="linkClass" @click="close">Missions</NuxtLink>
      <NuxtLink to="/alternant/calendar" :class="linkClass" @click="close">Calendrier</NuxtLink>
      <NuxtLink to="/alternant/presences" :class="linkClass" @click="close">Présences</NuxtLink>
      <NuxtLink to="/alternant/rapports" :class="linkClass" @click="close">Rapports</NuxtLink>
      <NuxtLink to="/alternant/annonces" :class="linkClass" @click="close">Annonces</NuxtLink>
      <NuxtLink to="/alternant/bulletins" :class="linkClass" @click="close">Bulletins</NuxtLink>
      <NuxtLink to="/alternant/competences" :class="linkClass" @click="close">Compétences</NuxtLink>
      <NuxtLink to="/alternant/visites" :class="linkClass" @click="close">Visites</NuxtLink>
      <NuxtLink to="/alternant/messages" :class="linkClass" @click="close">Messages</NuxtLink>
      <!-- L'entrée Notifications (commune aux espaces) est rendue par AppShell. -->
    </template>

    <slot />
  </AppShell>
</template>
