<script setup lang="ts">
interface LearnerAnnouncement {
  id: string
  title: string
  body: string
  pinned: boolean
  createdAt: string
  author: { firstName: string, lastName: string }
  readAt: string | null
}

const {
  data: learnerAnnouncements,
  refresh: refreshLearner
} = await useFetch<LearnerAnnouncement[]>('/api/announcements', {
  default: () => []
})

// Marquer comme lues à l'ouverture de la page (best effort).
onMounted(async () => {
  if (!import.meta.client) return
  const unread = (learnerAnnouncements.value ?? []).filter((a) => !a.readAt)
  if (unread.length === 0) return
  await Promise.all(
    unread.map((a) =>
      $fetch(`/api/announcements/${a.id}/read`, { method: 'POST' }).catch(
        () => undefined
      )
    )
  )
  await refreshLearner()
})
</script>

<template>
  <div class="w-full px-6 py-10 space-y-6">
    <PageHeader title="Annonces" />

    <div
      v-if="(learnerAnnouncements ?? []).length === 0"
      class="rounded-lg border border-dashed border-[var(--ui-border)] text-[var(--ui-text-muted)] text-sm py-12 text-center"
    >
      Vous n'avez reçu aucune annonce.
    </div>

    <div v-else class="space-y-4">
      <AnnouncementCard
        v-for="item in learnerAnnouncements"
        :key="item.id"
        :title="item.title"
        :body="item.body"
        :author="item.author"
        :created-at="item.createdAt"
        :pinned="item.pinned"
        :unread="!item.readAt"
      />
    </div>
  </div>
</template>
