<template>
  <!-- Shell du questionnaire de première connexion (/onboarding) : logo seul,
       sans navigation ni dock — rien ne doit détourner de la question posée.
       Le lien « Compléter plus tard » est porté par la page. -->
  <div class="min-h-screen flex flex-col bg-[var(--ui-bg)] text-[var(--ui-text)]">
    <header class="h-14 px-6 flex items-center">
      <span class="flex items-center gap-2" aria-label="alternup">
        <img
          src="/images/logo_nav_light.png"
          alt="alternup"
          width="110"
          height="24"
          class="h-6 w-auto dark:hidden"
        >
        <img
          src="/images/logo_nav_dark.png"
          alt="alternup"
          width="110"
          height="24"
          class="h-6 w-auto hidden dark:block"
        >
      </span>
    </header>
    <main class="flex-1 flex flex-col">
      <slot />
    </main>
  </div>
</template>
