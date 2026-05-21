<template>
  <div class="max-w-3xl mx-auto px-4 py-8 space-y-6">
    <UButton
      variant="ghost"
      color="neutral"
      icon="i-lucide-arrow-left"
      to="/alternants"
    >
      Retour à la liste
    </UButton>

    <div v-if="status === 'pending'" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="animate-spin h-8 w-8 text-primary-500" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      title="Erreur"
      :description="error.message"
    />

    <UCard v-else-if="alternant">
      <template #header>
        <div>
          <h1 class="text-2xl font-bold text-[var(--ui-text)]">
            {{ alternant.firstName }} {{ alternant.lastName }}
          </h1>
          <UBadge class="mt-1" color="primary" variant="subtle">
            {{ alternant.role }}
          </UBadge>
        </div>
      </template>

      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <dt class="text-sm text-[var(--ui-text-muted)]">Email</dt>
          <dd class="text-[var(--ui-text)]">{{ alternant.email }}</dd>
        </div>
        <div>
          <dt class="text-sm text-[var(--ui-text-muted)]">Créé le</dt>
          <dd class="text-[var(--ui-text)]">{{ formatDate(alternant.createdAt) }}</dd>
        </div>
        <div>
          <dt class="text-sm text-[var(--ui-text-muted)]">Dernière mise à jour</dt>
          <dd class="text-[var(--ui-text)]">{{ formatDate(alternant.updatedAt) }}</dd>
        </div>
      </dl>
    </UCard>

    <UAlert
      v-else
      color="warning"
      variant="soft"
      title="Alternant introuvable"
      description="Impossible de trouver les informations de l'alternant demandé."
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['role'],
  requireRole: 'Tutor'
})

interface AlternantDetail {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  createdAt: string
  updatedAt: string
}

const route = useRoute()

const { data: alternant, error, status } = await useFetch<AlternantDetail>(
  () => `/api/alternants/${route.params.id}`
)

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Non renseigné'
  return dateFormatter.format(new Date(dateStr))
}
</script>
