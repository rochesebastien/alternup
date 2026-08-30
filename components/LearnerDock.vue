<script setup lang="ts">
import { Role } from '~/shared/utils/enums'
import { spacePrefixFor } from '~/shared/utils/auth-redirect'

/**
 * « Dock apprenant » : pastille flottante en bas à droite de l'écran (desktop),
 * qui remplace le menu « Suivi » et le sélecteur d'apprenant de la barre de
 * navigation. Elle affiche en permanence la personne suivie, ouvre au survol le
 * menu des sept pages de Suivi et, pour un tuteur, permet de changer
 * d'apprenant via un bouton dédié.
 *
 * Implémentation volontairement « à la main » (pas de `UPopover` / `USelectMenu`) :
 * la zone de survol englobe trois éléments frères (bouton de changement,
 * pastille, panneaux) avec un délai de grâce commun, ce qu'un popup portalisé
 * dans `<body>` ne sait pas couvrir sans contorsions. Cela évite aussi tout
 * verrouillage du scroll.
 */
const route = useRoute()
const { user } = useUserSession()
const { isTutor, learners, focus, setFocus } = useLearnerFocus()

// Les liens de Suivi vivent dans l'espace du rôle connecté (/tuteur ou
// /alternant) : le dock est partagé par les deux layouts, le préfixe vient du
// rôle de session.
const space = computed<string>(() =>
  user.value ? spacePrefixFor(user.value.role) : '/alternant'
)

// Les sept modules de Suivi, dans l'ordre de la maquette.
const SUIVI_ITEMS = computed(() => [
  { label: 'Présences', icon: 'i-lucide-clipboard-check', to: `${space.value}/presences` },
  { label: 'Rapports', icon: 'i-lucide-file-text', to: `${space.value}/rapports` },
  { label: 'Bulletins', icon: 'i-lucide-graduation-cap', to: `${space.value}/bulletins` },
  { label: 'Compétences', icon: 'i-lucide-target', to: `${space.value}/competences` },
  { label: 'Visites', icon: 'i-lucide-map-pin', to: `${space.value}/visites` },
  { label: 'Annonces', icon: 'i-lucide-megaphone', to: `${space.value}/annonces` },
  { label: 'Messages', icon: 'i-lucide-mail', to: `${space.value}/messages` }
])

const ROLE_LABELS: Record<string, string> = {
  [Role.Alternant]: 'Alternant',
  [Role.Stagiaire]: 'Stagiaire'
}

// Un tuteur sans aucun apprenant n'a rien à commuter : il voit son propre nom.
const canSwitch = computed<boolean>(() => isTutor.value && learners.value.length > 0)

// Libellé de la pastille : l'apprenant suivi, sinon « Tous les apprenants »
// pour un tuteur, sinon le nom de l'utilisateur connecté (alternant/stagiaire).
const label = computed<string>(() => {
  if (focus.value) return `${focus.value.firstName} ${focus.value.lastName}`
  if (canSwitch.value) return 'Tous les apprenants'
  return user.value ? `${user.value.firstName} ${user.value.lastName}` : ''
})

const initials = computed<string>(() => {
  const person = focus.value ?? (canSwitch.value ? null : user.value)
  return person
    ? `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase()
    : ''
})

// L'`aria-label` remplace entièrement le texte visible de la pastille : il doit
// donc le contenir (WCAG 2.5.3 « Label in Name »), sinon la commande vocale
// « cliquer sur Tous les apprenants » — ou sur le nom affiché — ne trouve pas
// le bouton, et le lecteur d'écran n'annonce pas la personne suivie.
const pillLabel = computed<string>(() => {
  const action = 'Ouvrir le menu Suivi'
  if (!label.value) return action
  return focus.value
    ? `Apprenant suivi : ${label.value}. ${action}`
    : `${label.value}. ${action}`
})

/* ---------------------------------------------------------------- ouverture */

const root = ref<HTMLElement | null>(null)
const pill = ref<HTMLButtonElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)

const menuOpen = ref(false) // panneau « Suivi » (survol ou focus clavier)
const switcherOpen = ref(false) // panneau « apprenants » (clic)

// Le dock est « ouvert » dès qu'un de ses deux panneaux l'est : c'est cet état
// (et non le seul :hover CSS) qui pilote le fond de la pastille, pour qu'elle
// reste claire tant qu'on navigue dans un panneau, souris ou clavier.
const dockOpen = computed<boolean>(() => menuOpen.value || switcherOpen.value)
const query = ref('') // recherche du panneau des apprenants

let closeTimer: ReturnType<typeof setTimeout> | undefined

function openMenu(): void {
  clearTimeout(closeTimer)
  menuOpen.value = true
}

/**
 * Fermeture différée : la souris doit pouvoir traverser l'espace entre la
 * pastille et le panneau sans que celui-ci disparaisse. On ne ferme que si le
 * pointeur est vraiment sorti, que le focus n'est plus dans le dock et que le
 * panneau des apprenants (piloté au clic) n'est pas ouvert.
 *
 * Le survol est relu sur le DOM (`:hover`) plutôt que mémorisé dans un booléen :
 * quand un panneau se referme sous le curseur (choix d'un apprenant), le
 * navigateur ne dispatche aucun `mouseleave` — le pointeur n'a pas bougé, c'est
 * l'élément qui a disparu. Un drapeau resterait bloqué à « survolé » et le menu
 * ne se refermerait plus jamais ; `:hover`, lui, est toujours à jour.
 */
function scheduleClose(): void {
  clearTimeout(closeTimer)
  closeTimer = setTimeout(() => {
    if (switcherOpen.value) return
    if (root.value?.matches(':hover')) return
    if (root.value?.contains(document.activeElement)) return
    menuOpen.value = false
  }, 220)
}

function closeAll(): void {
  clearTimeout(closeTimer)
  menuOpen.value = false
  switcherOpen.value = false
  query.value = ''
}

function onEscape(): void {
  closeAll()
  pill.value?.focus()
}

async function toggleSwitcher(): Promise<void> {
  switcherOpen.value = !switcherOpen.value
  if (!switcherOpen.value) return
  await nextTick()
  searchInput.value?.focus()
}

onBeforeUnmount(() => clearTimeout(closeTimer))
onClickOutside(root, () => closeAll())
watch(() => route.fullPath, () => closeAll())

/* ------------------------------------------------------ choix de l'apprenant */

// Recherche insensible à la casse et aux accents : « Sebastien » trouve
// « Sébastien ».
const normalize = (value: string) =>
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const filteredLearners = computed(() => {
  const q = normalize(query.value.trim())
  if (!q) return learners.value
  return learners.value.filter((l) => normalize(`${l.firstName} ${l.lastName}`).includes(q))
})

/** `null` = « Tous les apprenants » : aucun filtre sur les pages de Suivi. */
function pick(id: string | null): void {
  setFocus(id)
  switcherOpen.value = false
  query.value = ''
  scheduleClose()
}

function isCurrent(to: string): boolean {
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <div
    ref="root"
    class="scroll-lock-shift fixed bottom-0 right-0 z-40 hidden md:block print:hidden"
    @keydown.escape="onEscape"
  >
    <!-- `scroll-lock-shift` (sur la racine) : le dock est calé sur le viewport ;
         sans cette marge il sauterait de la largeur de la scrollbar quand une
         modale Reka verrouille le scroll (voir assets/css/main.css). -->

    <!-- Zone interactive : un seul groupe de survol pour le bouton de
         changement, la pastille et leurs panneaux. -->
    <div
      class="relative flex items-end justify-end gap-2 p-5"
      @mouseenter="openMenu"
      @mouseleave="scheduleClose"
      @focusin="openMenu"
      @focusout="scheduleClose"
    >
      <!-- Bouton « changer d'apprenant » : apparaît au survol, à gauche de la pastille -->
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 translate-x-1"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 translate-x-1"
      >
        <div v-if="canSwitch && (menuOpen || switcherOpen)" class="relative">
          <button
            type="button"
            class="size-9 grid place-items-center rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] text-[var(--ui-text-muted)] dock-elevation transition-colors hover:bg-[var(--ui-bg-muted)] hover:text-[var(--ui-text)]"
            aria-haspopup="dialog"
            :aria-expanded="switcherOpen"
            aria-label="Changer d'apprenant"
            @click="toggleSwitcher"
          >
            <UIcon name="i-lucide-arrow-left-right" class="size-4" />
          </button>

          <!-- Panneau des apprenants : au-dessus, développé vers la gauche -->
          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-1"
          >
            <div
              v-if="switcherOpen"
              class="absolute bottom-full right-0 mb-2 w-72 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-1.5 dock-elevation"
              role="dialog"
              aria-label="Choisir un apprenant"
            >
              <ul class="max-h-64 overflow-y-auto">
                <li v-for="learner in filteredLearners" :key="learner.id">
                  <button
                    type="button"
                    class="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-[var(--ui-bg-muted)]"
                    @click="pick(learner.id)"
                  >
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-semibold text-[var(--ui-text)]">
                        {{ learner.firstName }} {{ learner.lastName }}
                      </span>
                      <span class="block text-xs text-[var(--ui-text-muted)]">
                        {{ ROLE_LABELS[learner.role] ?? learner.role }}
                      </span>
                    </span>
                    <UIcon
                      v-if="focus?.id === learner.id"
                      name="i-lucide-check"
                      class="size-4 shrink-0 text-[var(--ui-text)]"
                    />
                  </button>
                </li>
                <li v-if="!filteredLearners.length" class="px-3 py-2 text-sm text-[var(--ui-text-muted)]">
                  Aucun apprenant trouvé.
                </li>
              </ul>

              <!-- Recherche : champ natif, aucun popup imbriqué -->
              <div class="mt-1.5 flex items-center gap-2 border-t border-[var(--ui-border)] px-3 pt-2">
                <UIcon name="i-lucide-search" class="size-4 shrink-0 text-[var(--ui-text-dimmed)]" />
                <input
                  ref="searchInput"
                  v-model="query"
                  type="search"
                  placeholder="Rechercher un apprenant…"
                  aria-label="Rechercher un apprenant"
                  class="w-full bg-transparent py-1 text-sm text-[var(--ui-text)] placeholder:text-[var(--ui-text-dimmed)] focus:outline-none"
                >
              </div>

              <div class="mt-1.5 border-t border-[var(--ui-border)] pt-1.5">
                <button
                  type="button"
                  class="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[var(--ui-text)] transition-colors hover:bg-[var(--ui-bg-muted)]"
                  @click="pick(null)"
                >
                  <UIcon name="i-lucide-users" class="size-4 shrink-0 text-[var(--ui-text-muted)]" />
                  <span class="flex-1 text-left">Tous les apprenants</span>
                  <UIcon v-if="!focus" name="i-lucide-check" class="size-4 shrink-0" />
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>

      <!-- Pastille + menu Suivi. La pastille précède son panneau dans le DOM
           pour que la tabulation y entre naturellement. -->
      <div class="relative">
        <!-- Au repos, la pastille reprend le jaune de marque (comme le hover de
             la nav) ; dès que le dock est ouvert — donc dès le survol, qui ouvre
             le menu — elle bascule en inversé : fond sombre, texte et icône
             clairs, comme le lien actif de la nav. -->
        <button
          ref="pill"
          type="button"
          class="flex items-center gap-3 rounded-full border border-transparent py-1.5 pl-4 pr-1.5 dock-elevation transition-colors"
          :class="dockOpen
            ? 'bg-[var(--ui-bg-inverted)] text-[var(--ui-text-inverted)]'
            : 'bg-[var(--color-brand-500)] text-[#1F1F1E]'"
          aria-haspopup="menu"
          :aria-expanded="menuOpen"
          :aria-label="pillLabel"
          @click="menuOpen = !menuOpen"
        >
          <span class="whitespace-nowrap text-sm font-semibold">
            {{ label }}
          </span>
          <!-- L'avatar s'inverse à son tour, sinon il disparaîtrait dans le
               fond sombre de la pastille ouverte. -->
          <span
            class="size-8 shrink-0 grid place-items-center rounded-full text-xs font-semibold transition-colors"
            :class="dockOpen
              ? 'bg-[var(--ui-bg)] text-[var(--ui-text)]'
              : 'bg-[var(--ui-bg-inverted)] text-[var(--ui-text-inverted)]'"
            aria-hidden="true"
          >
            <template v-if="initials">{{ initials }}</template>
            <UIcon v-else name="i-lucide-users" class="size-4" />
          </span>
        </button>

        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-1"
        >
          <!-- Masqué pendant le choix d'apprenant : les deux panneaux se
               chevaucheraient au-dessus de la pastille. -->
          <div
            v-if="menuOpen && !switcherOpen"
            class="absolute bottom-full right-0 mb-3 w-56 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-1.5 dock-elevation"
          >
            <NuxtLink
              v-for="item in SUIVI_ITEMS"
              :key="item.to"
              :to="item.to"
              class="flex items-center justify-end gap-3 rounded-xl px-3 py-2 text-sm transition-colors hover:bg-[var(--ui-bg-muted)]"
              :class="isCurrent(item.to)
                ? 'bg-[var(--ui-bg-muted)] font-semibold text-[var(--ui-text)]'
                : 'font-medium text-[var(--ui-text)]'"
              :aria-current="isCurrent(item.to) ? 'page' : undefined"
              @click="closeAll"
            >
              <span>{{ item.label }}</span>
              <UIcon :name="item.icon" class="size-4 shrink-0 text-[var(--ui-text-muted)]" />
            </NuxtLink>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>
