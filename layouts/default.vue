<template>
  <!-- Layout minimal des pages communes hors espace (/account, /notifications,
       /forbidden) : nav sans liens de module — le dock et le menu du compte
       suffisent pour revenir dans son espace. -->
  <AppShell dock>
    <slot />
  </AppShell>
</template>
