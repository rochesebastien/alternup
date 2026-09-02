<template>
  <div class="w-full px-6 py-10 space-y-6">
    <PageHeader
      title="Offres"
      :subtitle="`${total} ${total > 1 ? 'offres d’alternance' : 'offre d’alternance'}`"
    >
      <template v-if="!readonly" #actions>
        <!-- « Mes candidatures » = filtre statut=candidate (ADR-0004) : l'onglet
             pilote le même ref que le select de statut, aucune vue séparée. -->
        <UTabs
          v-model="activeTab"
          :items="viewTabs"
          :content="false"
          size="xs"
          color="neutral"
          aria-label="Toutes les offres ou mes candidatures"
        />
      </template>
    </PageHeader>

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      :title="error.statusMessage ?? 'Erreur de chargement'"
      :description="errorDetail(error)"
    />

    <!-- Filtres server-side : chaque ref est reflété dans l'URL (partageable)
         et repasse par GET /api/offres via la query réactive. -->
    <div class="flex flex-wrap items-center gap-3">
      <UInput
        v-model="q"
        icon="i-lucide-search"
        placeholder="Rechercher un titre ou une entreprise…"
        aria-label="Rechercher un titre ou une entreprise"
        class="w-full sm:w-72"
      />
      <UInputMenu
        v-model="selectedVille"
        v-model:search-term="villeSearchTerm"
        :items="villeItems"
        :loading="villeStatus === 'pending'"
        ignore-filter
        clear
        icon="i-lucide-map-pin"
        placeholder="Ville ou code postal"
        aria-label="Filtrer par ville"
        class="w-full sm:w-64"
      >
        <template #item-trailing="{ item }">
          <span class="text-xs text-[var(--ui-text-muted)]">{{ item.total }}</span>
        </template>
      </UInputMenu>
      <USelect
        v-model="typeContratSelect"
        :items="contratItems"
        value-key="value"
        aria-label="Filtrer par type de contrat"
        class="w-full sm:w-56"
      />
      <USelect
        v-if="!readonly"
        v-model="statutSelect"
        :items="statutItems"
        value-key="value"
        aria-label="Filtrer par statut de candidature"
        class="w-full sm:w-56"
      />
      <UPopover :content="{ align: 'start', side: 'bottom', sideOffset: 8 }">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-calendar"
          class="w-full sm:w-auto justify-start"
          aria-label="Filtrer par période de publication"
        >
          {{ periodeLabel }}
        </UButton>

        <template #content>
          <div class="p-3 space-y-3">
            <!-- Chrome du calendrier (en-têtes de mois, jours, aria-labels de
                 nav) en anglais : `Calendar.vue` n'a pas de prop `locale`, elle
                 vient du contexte injecté par `<UApp>` (`useLocale`, non
                 configuré côté `app.vue`, hors périmètre). Un `provide()` du
                 contexte FR ici, sur ce seul sous-arbre, a été essayé puis
                 retiré : `useLocale` est enveloppé côté client dans
                 `createSharedComposable` (VueUse) et mémorise la première
                 résolution pour toute l'app (typiquement un autre composant de
                 la page, comme la nav, qui appelle `useLocale` avant que ce
                 `provide` ne s'exécute) — un `provide` local n'a alors aucun
                 effet observable. `periodeLabel` ci-dessous (bouton déclencheur)
                 reste en français, formaté à la main via `Intl.DateTimeFormat`.
            -->
            <!-- `as any` sur `model-value` (voir le commentaire de `onCalendarUpdate`
                 ci-dessous) : défaut de vue-tsc/@nuxt/ui sur le typage générique de
                 `UCalendar` en mode `range`, pas une échappatoire de confort. -->
            <UCalendar
              :model-value="(calendarModel as any)"
              range
              :number-of-months="numberOfMonths"
              :week-starts-on="1"
              @update:model-value="onCalendarUpdate"
            />
            <div class="flex justify-end border-t border-[var(--ui-border)] pt-3">
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                :disabled="!dateDebut && !dateFin"
                @click="clearPeriode"
              >
                Effacer
              </UButton>
            </div>
          </div>
        </template>
      </UPopover>
      <UCheckbox
        v-model="inclureExpirees"
        label="Inclure les offres expirées"
      />
    </div>

    <!-- Tableau server-side (ADR-0004) : les données arrivent déjà filtrées et
         paginées, aucun filtrage client. -->
    <div class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] overflow-hidden">
      <UTable
        :columns="columns"
        :data="offres"
        :loading="status === 'pending'"
        :empty="emptyLabel"
        :ui="{
          // `table-fixed` + largeurs en % (meta.class.th des colonnes) : le td
          // par défaut est en nowrap et la table en layout auto, ce qui pousse
          // toutes les colonnes de fin en scroll horizontal dès qu'un lieu est
          // une adresse complète. En layout fixe, titres et adresses passent à
          // la ligne et les 8 colonnes tiennent dans le conteneur ; sous
          // `min-w-[64rem]` (mobile), le scroll horizontal du root reprend.
          base: 'table-fixed min-w-[64rem]',
          td: 'px-3 whitespace-normal',
          th: 'px-3',
          tbody: '[&>tr]:transition-colors [&>tr]:hover:bg-[var(--ui-bg-muted)]'
        }"
      >
        <template #titre-cell="{ row }">
          <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span class="font-medium text-[var(--ui-text)]">
              {{ row.original.titre }}
            </span>
            <UBadge
              v-if="row.original.nouvelle"
              color="primary"
              variant="solid"
              class="shrink-0 bg-[var(--ui-primary)] text-black"
            >
              Nouveau
            </UBadge>
            <UBadge
              v-if="row.original.statut === 'expiree'"
              color="neutral"
              variant="soft"
              icon="i-lucide-clock-alert"
              class="shrink-0"
            >
              Expirée
            </UBadge>
          </div>
        </template>

        <template #entreprise-cell="{ row }">
          <span v-if="row.original.entreprise" class="block text-sm text-[var(--ui-text)]">
            {{ row.original.entreprise }}
          </span>
          <span v-else class="text-sm text-[var(--ui-text-muted)]">—</span>
        </template>

        <template #lieu-cell="{ row }">
          <span v-if="row.original.lieu" class="block text-sm text-[var(--ui-text-muted)]">
            {{ row.original.lieu }}
          </span>
          <span v-else class="text-sm text-[var(--ui-text-muted)]">—</span>
        </template>

        <template #typeContrat-cell="{ row }">
          <UBadge
            v-if="row.original.typeContrat"
            color="neutral"
            variant="subtle"
            :icon="OFFRE_CONTRAT_META[row.original.typeContrat].icon"
            class="font-normal whitespace-nowrap"
          >
            {{ OFFRE_CONTRAT_META[row.original.typeContrat].label }}
          </UBadge>
          <span v-else class="text-sm text-[var(--ui-text-muted)]">—</span>
        </template>

        <template #publieeLe-cell="{ row }">
          <span class="text-sm text-[var(--ui-text-muted)] whitespace-nowrap">
            {{ formatDate(row.original.datePublication ?? row.original.firstSeen) }}
          </span>
        </template>

        <template #monStatut-cell="{ row }">
          <UBadge
            v-if="row.original.monStatut"
            :color="CANDIDATURE_STATUT_COLOR[row.original.monStatut]"
            variant="soft"
            :icon="CANDIDATURE_STATUT_META[row.original.monStatut].icon"
            class="whitespace-nowrap"
          >
            {{ CANDIDATURE_STATUT_META[row.original.monStatut].label }}
          </UBadge>
          <span v-else class="text-sm text-[var(--ui-text-muted)]">—</span>
        </template>

        <template #lien-cell="{ row }">
          <!-- La candidature se fait chez la source (CGU LBA) : lien sortant. -->
          <UButton
            color="neutral"
            variant="solid"
            size="sm"
            trailing-icon="i-lucide-external-link"
            :to="row.original.url"
            target="_blank"
            rel="noopener noreferrer nofollow"
            :aria-label="`Voir l'offre ${row.original.titre} sur le site source`"
            class="whitespace-nowrap bg-black text-white hover:bg-neutral-800 active:bg-neutral-800 dark:bg-black dark:text-white dark:hover:bg-neutral-800 dark:active:bg-neutral-800"
          >
            Voir l'offre
          </UButton>
        </template>

        <template #actions-cell="{ row }">
          <UDropdownMenu :items="actionItems(row.original)" :content="{ align: 'end' }">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-ellipsis"
              size="sm"
              :loading="statutPending === row.original.id"
              :aria-label="`Actions sur l'offre ${row.original.titre}`"
            />
          </UDropdownMenu>
        </template>
      </UTable>
    </div>

    <div v-if="total > limit" class="flex justify-center">
      <UPagination
        v-model:page="page"
        :total="total"
        :items-per-page="limit"
        color="neutral"
        variant="outline"
        active-color="neutral"
      />
    </div>

    <!-- Attribution LBA : encart permanent exigé par les CGU (ADR-0004 § CGU). -->
    <div class="rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-4 flex items-start gap-3">
      <UIcon name="i-lucide-info" class="size-4 shrink-0 mt-0.5 text-[var(--ui-text-muted)]" aria-hidden="true" />
      <p class="text-xs text-[var(--ui-text-muted)]">
        Offres fournies par
        <a
          href="https://labonnealternance.apprentissage.beta.gouv.fr"
          target="_blank"
          rel="noopener noreferrer"
          class="underline underline-offset-4 hover:text-[var(--ui-text)]"
        >La bonne alternance</a>
        (API Apprentissage — Mission interministérielle pour l'apprentissage),
        mises à jour quotidiennement. Dernière synchronisation : {{ lastSyncLabel }}.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TableColumn, TabsItem } from '@nuxt/ui'
import { type DateValue, parseDate } from '@internationalized/date'
import { breakpointsTailwind } from '@vueuse/core'
import type { DateRange } from 'reka-ui'
import type { CandidatureStatut, OffreContratType, OffreStatut } from '~/shared/utils/enums'
import {
  CANDIDATURE_STATUT_META,
  formatVilleOption,
  OFFRE_CONTRAT_META,
  OFFRE_PAGE_SIZE,
  offreListFiltersFrom,
  offreListQueryFrom,
  type OffreListFilters,
  type OffreVilleOption
} from '~/shared/utils/offres'

/**
 * Tableau des offres, partagé entre les deux espaces (ADR-0001) :
 * `/alternant/offres` le rend en mode complet, `/tuteur/offres` en mode
 * `readonly` — consultation pure, sans onglet « Mes candidatures », sans
 * filtre ni colonne de statut de candidature et sans menu d'actions (les
 * statuts sont personnels à l'apprenant, un tuteur ne candidate pas).
 */
const props = defineProps<{ readonly?: boolean }>()

// Item de l'enveloppe { items, total, page, limit, lastSync } de GET /api/offres.
interface OffreListItem {
  id: string
  url: string
  titre: string
  entreprise: string | null
  lieu: string | null
  typeContrat: OffreContratType | null
  niveauDiplome: string | null
  romeCodes: string[]
  datePublication: string | null
  dateExpiration: string | null
  statut: OffreStatut
  firstSeen: string
  monStatut: CandidatureStatut | null
  nouvelle: boolean
}

interface OffreListResponse {
  items: OffreListItem[]
  total: number
  page: number
  limit: number
  lastSync: string | null
}

const route = useRoute()
const router = useRouter()
const toast = useToast()

// ─── Filtres : refs initialisés depuis l'URL (lien partageable) ───────────────
const initial = offreListFiltersFrom(route.query)

const q = ref(initial.q)
// `lieu` (`contains` texte libre) n'a plus de champ dans l'interface, remplacé
// par le sélecteur de ville ci-dessous : conservé en lecture seule pour ne pas
// casser un lien `?lieu=…` déjà partagé.
const lieu = ref(initial.lieu)
const typeContrat = ref<OffreContratType | ''>(initial.typeContrat)
// En lecture seule le filtre de statut n'existe pas : un `?statut=` copié
// depuis l'espace apprenant est ignoré plutôt que d'afficher une liste vide.
const statut = ref<CandidatureStatut | ''>(props.readonly ? '' : initial.statut)
const inclureExpirees = ref(initial.inclureExpirees)
const page = ref(initial.page)

// Le champ texte attend la fin de frappe avant de requêter le serveur.
const qDebounced = refDebounced(q, 300)

// ─── Filtre ville (UInputMenu alimenté par GET /api/offres/villes) ───────────
interface VilleOption {
  label: string
  /** Code postal exact — c'est la valeur envoyée au filtre serveur. */
  value: string
  total: number
}

const villeSearchTerm = ref('')
const villeSearchDebounced = refDebounced(villeSearchTerm, 250)
const villeQuery = computed(() => ({ q: villeSearchDebounced.value }))

const { data: villeData, status: villeStatus } = useFetch<{ items: OffreVilleOption[] }>(
  '/api/offres/villes',
  { query: villeQuery, default: () => ({ items: [] }) }
)

const villeItems = computed<VilleOption[]>(() =>
  villeData.value.items.map((v) => ({
    label: formatVilleOption(v.ville, v.codePostal),
    value: v.codePostal,
    total: v.total
  }))
)

// Le v-model porte l'item entier (pas `value-key`) : l'affichage du libellé
// sélectionné (`getDisplayValue`) retombe alors sur `selectedVille.value.label`
// même si l'item n'est plus dans `villeItems` (dropdown revenu à une recherche
// vide) — cas de l'arrivée directe ci-dessous.
const selectedVille = ref<VilleOption | null>(null)

// Arrivée directe avec `?codePostal=…` : le libellé n'est pas forcément dans
// les 15 villes les plus fréquentes retournées par défaut, on le résout par un
// appel dédié filtré sur ce code postal.
if (initial.codePostal) {
  const { data: initialVilleData } = await useFetch<{ items: OffreVilleOption[] }>(
    '/api/offres/villes',
    { query: { q: initial.codePostal }, default: () => ({ items: [] }) }
  )
  const match = initialVilleData.value.items.find((v) => v.codePostal === initial.codePostal)
  selectedVille.value = match
    ? { label: formatVilleOption(match.ville, match.codePostal), value: match.codePostal, total: match.total }
    : { label: initial.codePostal, value: initial.codePostal, total: 0 }
}

const codePostal = computed(() => selectedVille.value?.value ?? '')

// ─── Filtre période (UCalendar en mode plage, popover) ───────────────────────
function dateValueFrom(value: string): DateValue | undefined {
  return value ? parseDate(value) : undefined
}

const dateDebut = ref(initial.dateDebut)
const dateFin = ref(initial.dateFin)

// État propre au calendrier : reflète chaque clic (y compris une sélection en
// cours, borne de fin non posée) sans le répercuter tout de suite sur les
// filtres/la requête — `dateDebut`/`dateFin` ne sont mis à jour que lorsque la
// plage est complète (borne de fin posée, éventuellement égale à la borne de
// début pour une plage d'un seul jour).
const calendarModel = ref<DateRange>({
  start: dateValueFrom(initial.dateDebut),
  end: dateValueFrom(initial.dateFin)
})

watch(calendarModel, (value) => {
  if (!value?.start || !value?.end) return
  dateDebut.value = value.start.toString()
  dateFin.value = value.end.toString()
})

// `@update:model-value` en binding manuel (pas de `v-model`) : le type généré
// par vue-tsc pour un `UCalendar` générique en mode `range` échoue à
// réconcilier `DateValue` (`CalendarDate | CalendarDateTime | ZonedDateTime`,
// classes à champs privés de `@internationalized/date`) avec la valeur reçue,
// quel que soit le typage donné à `calendarModel` côté appelant (constaté avec
// `ref<DateRange>` explicite comme avec l'inférence — la même erreur
// `#private … manquant de ZonedDateTime` apparaît dans les deux cas). `unknown`
// contourne ce défaut d'inférence générique de `@nuxt/ui` sans `any` diffus.
function onCalendarUpdate(value: unknown) {
  const range = value as { start?: DateValue, end?: DateValue } | null
  calendarModel.value = { start: range?.start, end: range?.end }
}

function clearPeriode() {
  calendarModel.value = { start: undefined, end: undefined }
  dateDebut.value = ''
  dateFin.value = ''
}

const isSmAndUp = useBreakpoints(breakpointsTailwind).greaterOrEqual('sm')
const numberOfMonths = computed(() => (isSmAndUp.value ? 2 : 1))

const anneeCourante = new Date().getFullYear()

/** `forcerAnnee` : la borne de fin porte toujours l'année, celle de début uniquement si elle diffère de l'année courante. */
function formatBorne(date: DateValue, forcerAnnee: boolean): string {
  const jsDate = new Date(date.year, date.month - 1, date.day)
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: forcerAnnee || date.year !== anneeCourante ? 'numeric' : undefined
  }).format(jsDate)
}

const periodeLabel = computed(() => {
  if (!dateDebut.value || !dateFin.value) return 'Période'
  return `Du ${formatBorne(parseDate(dateDebut.value), false)} au ${formatBorne(parseDate(dateFin.value), true)}`
})

const filters = computed<OffreListFilters>(() => ({
  page: page.value,
  q: qDebounced.value,
  lieu: lieu.value,
  codePostal: codePostal.value,
  dateDebut: dateDebut.value,
  dateFin: dateFin.value,
  typeContrat: typeContrat.value,
  statut: statut.value,
  inclureExpirees: inclureExpirees.value
}))

// Tout changement de filtre ramène à la première page. Déclaré AVANT le
// useFetch : ce watcher s'exécute d'abord, la query part avec page=1.
watch(
  [qDebounced, typeContrat, statut, inclureExpirees, codePostal, dateDebut, dateFin],
  () => { page.value = 1 }
)

const query = computed(() => offreListQueryFrom(filters.value))

// URL partageable : la query minimale est reflétée sans recharger la page.
watch(query, (value) => { router.replace({ query: value }) })

const { data, status, error, refresh } = await useFetch<OffreListResponse>(
  '/api/offres',
  {
    query,
    default: () => ({ items: [], total: 0, page: 1, limit: OFFRE_PAGE_SIZE, lastSync: null })
  }
)

const offres = computed(() => data.value.items)
const total = computed(() => data.value.total)
const limit = computed(() => data.value.limit)

// ─── Onglets « Toutes / Mes candidatures » (= filtre statut=candidate) ───────
const viewTabs: TabsItem[] = [
  { label: 'Toutes', value: 'toutes' },
  { label: 'Mes candidatures', value: 'candidatures' }
]

const activeTab = computed({
  get: () => (statut.value === 'candidate' ? 'candidatures' : 'toutes'),
  set: (value: string | number) => {
    statut.value = value === 'candidatures' ? 'candidate' : ''
  }
})

// ─── Selects (miroirs d'enums de shared/utils, jamais @prisma/client) ────────
// Reka UI interdit la valeur `''` sur un item de select : les items « Tous »
// portent la sentinelle `TOUS`, traduite en `''` (« pas de filtre ») dans les
// refs de filtres via les computed d'adaptation ci-dessous.
const TOUS = 'tous'

const contratItems = [
  { label: 'Tous les contrats', value: TOUS },
  ...Object.entries(OFFRE_CONTRAT_META).map(([value, meta]) => ({
    label: meta.label,
    value,
    icon: meta.icon
  }))
]

const statutItems = [
  { label: 'Tous les statuts', value: TOUS },
  ...Object.entries(CANDIDATURE_STATUT_META).map(([value, meta]) => ({
    label: meta.label,
    value,
    icon: meta.icon
  }))
]

const typeContratSelect = computed({
  get: () => typeContrat.value || TOUS,
  set: (value: string) => {
    typeContrat.value = value === TOUS ? '' : (value as OffreContratType)
  }
})

const statutSelect = computed({
  get: () => statut.value || TOUS,
  set: (value: string) => {
    statut.value = value === TOUS ? '' : (value as CandidatureStatut)
  }
})

// ─── Tableau ─────────────────────────────────────────────────────────────────
// Largeurs en % (layout `table-fixed`, voir le `:ui` du tableau). En lecture
// seule, les colonnes Statut et Actions disparaissent : leurs largeurs sont
// redistribuées pour garder un total de 100 %.
const columns = computed<TableColumn<OffreListItem>[]>(() => props.readonly
  ? [
      { accessorKey: 'titre', header: 'Titre', meta: { class: { th: 'w-[30%]' } } },
      { accessorKey: 'entreprise', header: 'Entreprise', meta: { class: { th: 'w-[15%]' } } },
      { accessorKey: 'lieu', header: 'Lieu', meta: { class: { th: 'w-[17%]' } } },
      { accessorKey: 'typeContrat', header: 'Contrat', meta: { class: { th: 'w-[16%]' } } },
      { accessorKey: 'publieeLe', header: 'Publiée le', meta: { class: { th: 'w-[11%]' } } },
      { accessorKey: 'lien', header: 'Lien', meta: { class: { th: 'w-[11%]' } } }
    ]
  : [
      { accessorKey: 'titre', header: 'Titre', meta: { class: { th: 'w-[25%]' } } },
      { accessorKey: 'entreprise', header: 'Entreprise', meta: { class: { th: 'w-[12%]' } } },
      { accessorKey: 'lieu', header: 'Lieu', meta: { class: { th: 'w-[13%]' } } },
      { accessorKey: 'typeContrat', header: 'Contrat', meta: { class: { th: 'w-[14%]' } } },
      { accessorKey: 'publieeLe', header: 'Publiée le', meta: { class: { th: 'w-[8%]' } } },
      { accessorKey: 'monStatut', header: 'Statut', meta: { class: { th: 'w-[14%]' } } },
      // En-têtes non vides obligatoires : un `header: ''` SSR produit un nœud texte
      // vide absent côté client → « Hydration completed but contains mismatches »
      // (constaté au navigateur ; le gabarit tuteur n'y échappe que parce que sa
      // vue tableau n'est jamais rendue au SSR).
      { accessorKey: 'lien', header: 'Lien', meta: { class: { th: 'w-[9%]' } } },
      { accessorKey: 'actions', header: 'Actions', meta: { class: { th: 'w-[5%]' } } }
    ])

const CANDIDATURE_STATUT_COLOR: Record<CandidatureStatut, 'neutral' | 'success' | 'error'> = {
  vue: 'neutral',
  candidate: 'success',
  rejetee: 'error'
}

const hasActiveFilters = computed(() =>
  Boolean(
    q.value.trim() || lieu.value.trim() || typeContrat.value || statut.value
    || codePostal.value || dateDebut.value || dateFin.value
  )
)

const emptyLabel = computed(() =>
  hasActiveFilters.value
    ? 'Aucune offre ne correspond à vos filtres.'
    : 'Aucune offre disponible pour le moment.'
)

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
})

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})

function formatDate(value: string): string {
  return dateFormatter.format(new Date(value))
}

const lastSyncLabel = computed(() =>
  data.value.lastSync
    ? dateTimeFormatter.format(new Date(data.value.lastSync))
    : 'en attente de la première synchronisation'
)

function errorDetail(err: { data?: { statusMessage?: string }, message?: string }): string | undefined {
  return err.data?.statusMessage || err.message
}

// ─── Actions de statut (menu par ligne, ADR-0004) ────────────────────────────
// Jamais rendues en lecture seule : la colonne Actions est absente des colonnes
// readonly, et POST /api/offres/:id/statut refuse de toute façon un tuteur.
const STATUT_TOAST: Record<CandidatureStatut, string> = {
  vue: 'Offre marquée comme vue',
  candidate: 'Candidature enregistrée',
  rejetee: 'Offre rejetée'
}

const statutPending = ref<string | null>(null)

function actionItems(offre: OffreListItem) {
  return [[
    { label: 'Marquer vue', icon: 'i-lucide-eye', onSelect: () => setStatut(offre, 'vue') },
    { label: 'J\'ai candidaté', icon: 'i-lucide-send', onSelect: () => setStatut(offre, 'candidate') },
    { label: 'Rejeter', icon: 'i-lucide-x', color: 'error' as const, onSelect: () => setStatut(offre, 'rejetee') }
  ]]
}

async function setStatut(offre: OffreListItem, nouveauStatut: CandidatureStatut) {
  statutPending.value = offre.id
  try {
    await $fetch(`/api/offres/${offre.id}/statut`, {
      method: 'POST',
      body: { statut: nouveauStatut }
    })
    await refresh()
    toast.add({
      title: STATUT_TOAST[nouveauStatut],
      description: offre.titre,
      color: 'success'
    })
  } catch (err: unknown) {
    toast.add({
      title: readErrorMessage(err) ?? 'Impossible de mettre à jour le statut.',
      color: 'error'
    })
  } finally {
    statutPending.value = null
  }
}

function readErrorMessage(err: unknown): string | null {
  const e = err as {
    statusMessage?: string
    data?: { statusMessage?: string, issues?: Array<{ message: string }> }
  }
  return (
    e.data?.statusMessage
    || e.data?.issues?.[0]?.message
    || e.statusMessage
    || null
  )
}
</script>
