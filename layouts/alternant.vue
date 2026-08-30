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
      <NuxtLink to="/alternant/evolution" :class="navLinkClass('/alternant/evolution')">
        Mon évolution
      </NuxtLink>
      <NuxtLink to="/alternant/tuteur" :class="navLinkClass('/alternant/tuteur')">
        Mon tuteur
      </NuxtLink>
      <NuxtLink
        to="/alternant/offres"
        :class="navLinkClass('/alternant/offres')"
        class="inline-flex items-center gap-1.5"
      >
        <UIcon name="i-lucide-briefcase" class="size-4" aria-hidden="true" />
        Offres
      </NuxtLink>
      <!-- Les pages de Suivi vivent dans le dock apprenant (coin bas-droit). -->
    </template>

    <template #mobile-links="{ close, linkClass }">
      <NuxtLink to="/alternant/dashboard" :class="linkClass" @click="close">Tableau de bord</NuxtLink>
      <NuxtLink to="/alternant/courses" :class="linkClass" @click="close">Cours</NuxtLink>
      <NuxtLink to="/alternant/missions" :class="linkClass" @click="close">Missions</NuxtLink>
      <NuxtLink to="/alternant/calendar" :class="linkClass" @click="close">Calendrier</NuxtLink>
      <NuxtLink to="/alternant/evolution" :class="linkClass" @click="close">Mon évolution</NuxtLink>
      <NuxtLink to="/alternant/tuteur" :class="linkClass" @click="close">Mon tuteur</NuxtLink>
      <NuxtLink
        to="/alternant/offres"
        :class="linkClass"
        class="flex items-center gap-2"
        @click="close"
      >
        <UIcon name="i-lucide-briefcase" class="size-4" aria-hidden="true" />
        Offres
      </NuxtLink>
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
