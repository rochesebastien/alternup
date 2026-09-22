<template>
  <div class="w-full px-6 py-8 space-y-6">
    <UBreadcrumb :items="breadcrumb" />

    <div v-if="status === 'pending' && !offre" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-[var(--ui-text-dimmed)]" />
    </div>

    <UAlert
      v-else-if="error || !offre"
      color="error"
      variant="soft"
      icon="i-lucide-triangle-alert"
      title="Offre introuvable"
      description="Cette offre n'existe pas ou n'est plus disponible."
    />

    <template v-else>
      <!-- En-tête : titre, entreprise, badges clés, actions -->
      <header class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0 space-y-3">
          <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--ui-text)]">
            {{ offre.titre }}
          </h1>
          <p class="text-base text-[var(--ui-text-muted)]">
            {{ [offre.entreprise, offre.lieu].filter(Boolean).join(' · ') || 'Entreprise non précisée' }}
          </p>
          <div class="flex flex-wrap items-center gap-2">
            <UBadge
              v-if="offre.typeContrat"
              color="neutral"
              variant="subtle"
              :icon="OFFRE_CONTRAT_META[offre.typeContrat].icon"
            >
              {{ OFFRE_CONTRAT_META[offre.typeContrat].label }}
            </UBadge>
            <UBadge v-if="niveau" color="neutral" variant="subtle" icon="i-lucide-graduation-cap">
              {{ niveau }}
            </UBadge>
            <UBadge v-if="duree" color="neutral" variant="subtle" icon="i-lucide-hourglass">
              {{ duree }}
            </UBadge>
            <UBadge v-if="teletravail" color="neutral" variant="subtle" icon="i-lucide-house">
              {{ teletravail }}
            </UBadge>
            <UBadge v-if="offre.statut === 'expiree'" color="neutral" variant="soft" icon="i-lucide-clock-alert">
              Expirée
            </UBadge>
            <UBadge
              v-if="offre.monStatut"
              :color="STATUT_COLOR[offre.monStatut]"
              variant="soft"
              :icon="CANDIDATURE_STATUT_META[offre.monStatut].icon"
            >
              {{ CANDIDATURE_STATUT_META[offre.monStatut].label }}
            </UBadge>
          </div>
        </div>

        <div class="flex shrink-0 flex-wrap items-center gap-2">
          <UDropdownMenu v-if="!readonly" :items="statutItems" :content="{ align: 'end' }">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-list-checks"
              trailing-icon="i-lucide-chevron-down"
              label="Mon suivi"
              :loading="statutPending"
            />
          </UDropdownMenu>
          <!-- La candidature se fait chez la source (CGU LBA) : lien sortant. -->
          <UButton
            :to="offre.url"
            target="_blank"
            rel="noopener noreferrer nofollow"
            trailing-icon="i-lucide-external-link"
            label="Postuler sur le site de l'offre"
            color="neutral"
          />
        </div>
      </header>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Colonne principale : le poste -->
        <div class="space-y-6 lg:col-span-2">
          <section :class="card">
            <h2 :class="cardTitle">
              <UIcon name="i-lucide-file-text" class="size-4 text-[var(--ui-text-muted)]" />
              Description du poste
            </h2>
            <p
              v-if="offre.detail.offre.description"
              class="mt-3 whitespace-pre-line text-sm leading-relaxed text-[var(--ui-text-toned)]"
            >
              {{ offre.detail.offre.description }}
            </p>
            <p v-else class="mt-3 text-sm text-[var(--ui-text-dimmed)]">
              L'annonce ne comporte pas de description. Consultez-la sur le site de l'offre.
            </p>
          </section>

          <section :class="card">
            <h2 :class="cardTitle">
              <UIcon name="i-lucide-target" class="size-4 text-[var(--ui-text-muted)]" />
              Compétences
            </h2>
            <div class="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div v-for="groupe in competences" :key="groupe.label">
                <h3 class="text-xs uppercase tracking-wide text-[var(--ui-text-dimmed)]">{{ groupe.label }}</h3>
                <div v-if="groupe.items.length" class="mt-2 flex flex-wrap gap-1.5">
                  <UBadge v-for="item in groupe.items" :key="item" color="neutral" variant="outline" class="font-normal">
                    {{ item }}
                  </UBadge>
                </div>
                <p v-else class="mt-2 text-sm text-[var(--ui-text-dimmed)]">Non précisé</p>
              </div>
            </div>
          </section>

          <section :class="card">
            <h2 :class="cardTitle">
              <UIcon name="i-lucide-building-2" class="size-4 text-[var(--ui-text-muted)]" />
              L'entreprise
            </h2>
            <p
              v-if="offre.detail.entreprise.description"
              class="mt-3 whitespace-pre-line text-sm leading-relaxed text-[var(--ui-text-toned)]"
            >
              {{ offre.detail.entreprise.description }}
            </p>
            <OffreDetailRows :rows="entrepriseRows" class="mt-4" />
          </section>
        </div>

        <!-- Colonne latérale : contrat, lieu, candidature, publication -->
        <aside class="space-y-6">
          <section v-for="bloc in aside" :key="bloc.title" :class="card">
            <h2 :class="cardTitle">
              <UIcon :name="bloc.icon" class="size-4 text-[var(--ui-text-muted)]" />
              {{ bloc.title }}
            </h2>
            <OffreDetailRows :rows="bloc.rows" class="mt-4" stacked />
          </section>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { BreadcrumbItem } from '@nuxt/ui'
import type { CandidatureStatut } from '~/shared/utils/enums'
import {
  CANDIDATURE_STATUT_META,
  OFFRE_CONTRAT_META,
  formatDureeMois,
  niveauDiplomeLabel
} from '~/shared/utils/offres'
import {
  TELETRAVAIL_LABELS,
  partenaireLabel,
  tailleEntrepriseLabel,
  type OffreDetailResponse,
  type OffreDetailRow
} from '~/shared/utils/offre-detail'
import { spacePrefixOf } from '~/shared/utils/auth-redirect'

/** `readonly` : espace tuteur, consultation sans suivi de candidature. */
const props = defineProps<{ readonly?: boolean }>()

const route = useRoute()
const toast = useToast()
const id = computed(() => String(route.params.id))

const { data: offre, status, error, refresh } = await useFetch<OffreDetailResponse>(
  () => `/api/offres/${id.value}`
)

useHead(() => ({ title: offre.value ? `${offre.value.titre} - Alternup` : 'Offre - Alternup' }))

const card = 'rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-5'
const cardTitle = 'flex items-center gap-2 text-sm font-semibold text-[var(--ui-text)]'

// ─── Fil d'Ariane : retour au tableau tel qu'on l'a quitté ────────────────────
const listQuery = useOffresListQuery()
const breadcrumb = computed<BreadcrumbItem[]>(() => [
  {
    label: 'Offres',
    icon: 'i-lucide-briefcase',
    // Jamais tronqué : c'est le titre de l'offre qui cède la place sur mobile.
    ui: { item: 'shrink-0' },
    to: { path: `${spacePrefixOf(route.path) ?? '/alternant'}/offres`, query: listQuery.value }
  },
  // Élément courant en couleur de texte : le jaune de marque (couleur « active »
  // par défaut) est illisible sur fond clair.
  { label: offre.value?.titre ?? 'Offre', class: 'text-[var(--ui-text)]' }
])

// ─── Mise en forme ────────────────────────────────────────────────────────────
// Fuseau explicite : le rendu serveur (conteneur en UTC) et le navigateur
// doivent produire le même texte, sinon écart d'hydratation.
const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Paris'
})

function formatDate(iso: string | null): string | null {
  return iso ? dateFormatter.format(new Date(iso)) : null
}

/** Date calendaire `YYYY-MM-DD` (début de contrat) : pas de fuseau à appliquer. */
function formatJour(jour: string | null): string | null {
  if (!jour) return null
  const [y, m, d] = jour.split('-').map(Number)
  if (!y || !m || !d) return jour
  return dateFormatter.format(new Date(Date.UTC(y, m - 1, d, 12)))
}

const niveau = computed(() => niveauDiplomeLabel(offre.value?.niveauDiplome))
const duree = computed(() => formatDureeMois(offre.value?.dureeMois ?? offre.value?.detail.contrat.dureeMois))
const teletravail = computed(() => {
  const mode = offre.value?.detail.contrat.teletravail
  return mode ? TELETRAVAIL_LABELS[mode] ?? mode : null
})

const competences = computed(() => [
  { label: 'Compétences attendues', items: offre.value?.detail.offre.competencesAttendues ?? [] },
  { label: 'Compétences à acquérir', items: offre.value?.detail.offre.competencesAcquises ?? [] }
])

const entrepriseRows = computed<OffreDetailRow[]>(() => {
  const e = offre.value?.detail.entreprise
  if (!e) return []
  return [
    { label: 'Nom', value: e.nom ?? offre.value?.entreprise ?? null },
    { label: 'Raison sociale', value: e.raisonSociale },
    { label: 'Marque', value: e.marque },
    { label: 'Taille', value: tailleEntrepriseLabel(e.taille) },
    { label: 'Secteur (NAF)', value: e.naf.libelle ? `${e.naf.libelle}${e.naf.code ? ` (${e.naf.code})` : ''}` : e.naf.code },
    { label: 'SIRET', value: e.siret, mono: true },
    { label: 'OPCO', value: e.opco },
    { label: 'Convention collective (IDCC)', value: e.idcc, mono: true },
    { label: 'Site web', value: e.siteWeb, href: e.siteWeb }
  ]
})

const aside = computed(() => {
  const o = offre.value
  if (!o) return []
  const d = o.detail
  const { latitude, longitude } = d.localisation
  const carte = latitude !== null && longitude !== null
    ? `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`
    : null
  const niveauComplet = [niveau.value, d.offre.niveau.libelle].filter(Boolean)
  return [
    {
      title: 'Le contrat',
      icon: 'i-lucide-file-signature',
      rows: [
        { label: 'Type de contrat', value: d.contrat.types.join(', ') || (o.typeContrat ? OFFRE_CONTRAT_META[o.typeContrat].label : null) },
        { label: 'Niveau de diplôme visé', value: niveauComplet.length ? [...new Set(niveauComplet)].join(' · ') : null },
        { label: 'Durée', value: duree.value ? `${duree.value}${o.dureeMois && o.dureeMois % 12 === 0 ? ` (${o.dureeMois} mois)` : ''}` : null },
        { label: 'Début', value: formatJour(d.contrat.debut) },
        { label: 'Mode de travail', value: teletravail.value },
        { label: 'Postes à pourvoir', value: d.offre.nombrePostes !== null ? String(d.offre.nombrePostes) : null },
        { label: "Conditions d'accès", value: d.offre.conditionsAcces.join(', ') || null }
      ]
    },
    {
      title: 'Localisation',
      icon: 'i-lucide-map-pin',
      rows: [
        { label: 'Adresse', value: d.localisation.adresse ?? o.lieu },
        { label: 'Carte', value: carte ? 'Voir sur OpenStreetMap' : null, href: carte }
      ]
    },
    {
      title: 'Candidature',
      icon: 'i-lucide-send',
      rows: [
        { label: "Lien de l'offre", value: 'Ouvrir le site de l\'offre', href: o.url },
        { label: 'Téléphone', value: d.candidature.telephone, href: d.candidature.telephone ? `tel:${d.candidature.telephone.replace(/\s+/g, '')}` : null },
        {
          label: 'Offre gérée par un CFA',
          value: d.source.delegue === null ? null : d.source.delegue ? 'Oui, pour le compte de l\'entreprise' : 'Non, directement par l\'entreprise'
        }
      ]
    },
    {
      title: 'Publication',
      icon: 'i-lucide-calendar',
      rows: [
        { label: 'Publiée le', value: formatDate(o.datePublication) },
        { label: 'Expire le', value: formatDate(o.dateExpiration) },
        { label: 'Repérée par Alternup le', value: formatDate(o.firstSeen) },
        { label: 'Dernière vérification', value: formatDate(o.lastSeen) },
        { label: 'Statut chez la source', value: o.statut === 'expiree' ? 'Expirée' : d.offre.statutSource === 'Active' ? 'Active' : d.offre.statutSource },
        { label: 'Codes métier (ROME)', value: o.romeCodes.join(', ') || null, mono: true },
        { label: 'Diffusée par', value: partenaireLabel(d.source.partenaire) },
        { label: 'Référence', value: d.source.idPartenaire ?? d.source.identifiant, mono: true }
      ]
    }
  ] satisfies Array<{ title: string; icon: string; rows: OffreDetailRow[] }>
})

// ─── Suivi de candidature (apprenant) ────────────────────────────────────────
const STATUT_COLOR: Record<CandidatureStatut, 'neutral' | 'success' | 'error'> = {
  vue: 'neutral',
  candidate: 'success',
  rejetee: 'error'
}

const statutPending = ref(false)

const statutItems = computed(() => [[
  { label: 'Marquer vue', icon: 'i-lucide-eye', onSelect: () => setStatut('vue') },
  { label: "J'ai candidaté", icon: 'i-lucide-send', onSelect: () => setStatut('candidate') },
  { label: 'Rejeter', icon: 'i-lucide-x', color: 'error' as const, onSelect: () => setStatut('rejetee') }
]])

async function setStatut(statut: CandidatureStatut) {
  if (props.readonly || !offre.value) return
  statutPending.value = true
  try {
    await $fetch(`/api/offres/${offre.value.id}/statut`, { method: 'POST', body: { statut } })
    await refresh()
    toast.add({ title: CANDIDATURE_STATUT_META[statut].label, description: offre.value?.titre, color: 'success' })
  } catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string } }
    toast.add({ title: e.data?.statusMessage ?? 'Impossible de mettre à jour le statut.', color: 'error' })
  } finally {
    statutPending.value = false
  }
}
</script>
