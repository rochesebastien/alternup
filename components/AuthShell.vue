<template>
  <!-- Pages d'authentification : fond jaune strié pleine page, formulaire dans
       une carte à gauche, accroche en texte sombre à droite (cachée en mobile).
       Le fond étant toujours jaune, l'accroche reste sombre dans les deux thèmes. -->
  <div class="min-h-[calc(100vh-3.5rem)] bg-[url('/images/auth-bg.svg')] bg-cover bg-center">
    <div
      class="max-w-6xl mx-auto px-4 sm:px-8 py-12 lg:py-16 min-h-[calc(100vh-3.5rem)] grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center"
    >
      <div
        class="w-full max-w-md mx-auto lg:mx-0 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg)]/95 backdrop-blur shadow-xl p-8"
      >
        <slot />
      </div>

      <p
        class="hidden lg:block text-5xl xl:text-6xl font-semibold tracking-tight leading-tight text-[#1F1F1E]"
      >
        Manage your student like never
      </p>
    </div>
  </div>
</template>
