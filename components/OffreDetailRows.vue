<template>
  <!-- Liste « libellé → valeur » de la page détail d'une offre. Tous les champs
       sont listés, même vides (« Non précisé ») : l'apprenant voit d'un coup
       d'œil ce que l'annonce dit et ce qu'elle tait. -->
  <dl :class="stacked ? 'space-y-3' : 'grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2'">
    <div v-for="row in rows" :key="row.label">
      <dt class="text-xs uppercase tracking-wide text-[var(--ui-text-dimmed)]">{{ row.label }}</dt>
      <dd class="mt-0.5 text-sm break-words">
        <template v-if="row.value">
          <a
            v-if="row.href"
            :href="row.href"
            :target="row.href.startsWith('http') ? '_blank' : undefined"
            :rel="row.href.startsWith('http') ? 'noopener noreferrer nofollow' : undefined"
            class="inline-flex items-center gap-1 text-[var(--ui-text)] underline underline-offset-4 hover:no-underline"
          >
            {{ row.value }}
            <UIcon v-if="row.href.startsWith('http')" name="i-lucide-external-link" class="size-3.5" />
          </a>
          <span v-else class="text-[var(--ui-text)]" :class="row.mono ? 'font-mono' : ''">{{ row.value }}</span>
        </template>
        <span v-else class="text-[var(--ui-text-dimmed)]">Non précisé</span>
      </dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
import type { OffreDetailRow } from '~/shared/utils/offre-detail'

defineProps<{ rows: OffreDetailRow[]; stacked?: boolean }>()
</script>
