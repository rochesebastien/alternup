<template>
  <div class="container mx-auto px-4 py-8">
    <div class="mb-8 flex items-center justify-between">
      <h1 class="text-3xl font-bold text-gray-900">Alternants</h1>
    </div>

    <AlternantsList
      :loading="status === 'pending'"
      :alternants="alternants ?? []"
      :error="error?.message ?? null"
      @view="viewAlternant"
    />
  </div>
</template>

<script setup lang="ts">
import type { AlternantListItem } from '~/components/AlternantsList.vue'

const router = useRouter()

const { data: alternants, error, status } = await useFetch<AlternantListItem[]>('/api/alternants')

function viewAlternant(id: string) {
  router.push(`/alternants/${id}`)
}
</script>
