<template>
  <div class="mx-auto max-w-3xl px-6 py-10 space-y-6">
    <UButton
      variant="link"
      color="neutral"
      icon="i-lucide-arrow-left"
      to="/alternants"
      class="-ml-2 px-2 text-[var(--ui-text-muted)]"
    >
      Retour à la liste
    </UButton>

    <div v-if="status === 'pending'" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="animate-spin h-6 w-6 text-[var(--ui-text-dimmed)]" />
    </div>

    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      title="Erreur"
      :description="error.message"
    />

    <template v-else-if="alternant">
      <PageHeader :title="`${alternant.firstName} ${alternant.lastName}`">
        <template #actions>
          <UBadge color="neutral" variant="subtle" class="font-normal">
            {{ alternant.role }}
          </UBadge>
        </template>
      </PageHeader>

      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
        <div class="space-y-1">
          <dt class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">Email</dt>
          <dd class="text-sm text-[var(--ui-text)]">{{ alternant.email }}</dd>
        </div>
        <div class="space-y-1">
          <dt class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">Créé le</dt>
          <dd class="text-sm text-[var(--ui-text)]">{{ formatDate(alternant.createdAt) }}</dd>
        </div>
        <div class="space-y-1">
          <dt class="text-xs font-medium text-[var(--ui-text-dimmed)] uppercase tracking-wide">Dernière mise à jour</dt>
          <dd class="text-sm text-[var(--ui-text)]">{{ formatDate(alternant.updatedAt) }}</dd>
        </div>
      </dl>
    </template>

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
