<template>
  <div class="w-full max-w-3xl mx-auto px-6 py-10 space-y-6">
    <PageHeader title="Mon compte" subtitle="Informations de votre profil Alternup." />

    <div
      v-if="user"
      class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-6"
    >
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
        <div>
          <dt class="text-xs uppercase tracking-wide text-[var(--ui-text-dimmed)]">Prénom</dt>
          <dd class="mt-1 text-sm text-[var(--ui-text)]">{{ user.firstName }}</dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wide text-[var(--ui-text-dimmed)]">Nom</dt>
          <dd class="mt-1 text-sm text-[var(--ui-text)]">{{ user.lastName }}</dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wide text-[var(--ui-text-dimmed)]">Email</dt>
          <dd class="mt-1 text-sm text-[var(--ui-text)]">{{ user.email }}</dd>
        </div>
        <div>
          <dt class="text-xs uppercase tracking-wide text-[var(--ui-text-dimmed)]">Rôle</dt>
          <dd class="mt-1"><UBadge color="neutral" variant="soft">{{ roleLabel }}</UBadge></dd>
        </div>
      </dl>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Role } from '~/shared/utils/enums'

const { user } = useUserSession()

const ROLE_LABELS: Record<string, string> = {
  [Role.Tutor]: 'Tuteur',
  [Role.Alternant]: 'Alternant',
  [Role.Stagiaire]: 'Stagiaire'
}
const roleLabel = computed(() => (user.value ? ROLE_LABELS[user.value.role] ?? user.value.role : ''))
</script>
