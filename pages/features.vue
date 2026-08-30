<template>
  <div class="overflow-x-hidden">
    <!-- ============== HERO ============== -->
    <section class="pt-16 sm:pt-24 pb-10 sm:pb-14">
      <div class="max-w-[820px] mx-auto px-6 text-center">
        <h1 data-reveal class="text-4xl sm:text-5xl lg:text-[64px] leading-[1.05] font-extrabold tracking-[-0.035em] mb-5">
          Fonctionnalités
        </h1>
        <p data-reveal style="--d:.05s" class="text-lg leading-[1.55] text-[var(--ui-text-muted)] max-w-[640px] mx-auto">
          Tout ce qu'Alternup fait vraiment, côté tuteur comme côté alternant ou
          stagiaire.
        </p>
      </div>
    </section>

    <!-- ============== FILTRES ============== -->
    <div class="px-6">
      <div
        data-reveal
        style="--d:.1s"
        class="max-w-[860px] mx-auto flex flex-wrap justify-center gap-2 sm:gap-3 mb-14 sm:mb-20"
        role="tablist"
        aria-label="Filtrer les fonctionnalités par profil"
      >
        <button
          v-for="cat in categories"
          :key="cat.id"
          type="button"
          role="tab"
          :aria-selected="activeCategory === cat.id"
          class="rounded-full text-[15px] font-semibold px-5 sm:px-6 py-2.5 transition-colors"
          :class="
            activeCategory === cat.id
              ? 'bg-brand-500 text-black'
              : 'bg-[var(--ui-bg-muted)] text-[var(--ui-text-toned)] hover:bg-[var(--ui-bg-accented)]'
          "
          @click="activeCategory = cat.id"
        >
          {{ cat.label }}
        </button>
      </div>
    </div>

    <!-- ============== FEATURES ============== -->
    <section class="pb-12 sm:pb-16">
      <div class="max-w-[1200px] mx-auto px-6">
        <template v-for="group in visibleGroups" :key="group.id">
          <h2 data-reveal class="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-[-0.025em] mb-10 sm:mb-12">
            {{ group.title }}
          </h2>

          <div class="space-y-20 sm:space-y-28 mb-24 sm:mb-32">
            <article
              v-for="feature in group.features"
              :key="feature.id"
              data-reveal
              class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center"
            >
              <!-- Mockup à gauche -->
              <div class="lg:col-span-7">
                <component :is="feature.mockup" />
              </div>

              <!-- Texte à droite -->
              <div class="lg:col-span-5">
                <h3 class="text-xl sm:text-2xl font-extrabold tracking-[-0.02em] mb-3">
                  {{ feature.title }}
                </h3>
                <p class="text-[15.5px] leading-[1.6] text-[var(--ui-text-muted)]">
                  {{ feature.description }}
                </p>
                <ul v-if="feature.bullets" class="mt-5 space-y-2.5">
                  <li
                    v-for="(b, i) in feature.bullets"
                    :key="i"
                    class="flex items-start gap-2.5 text-[14.5px] leading-[1.5] text-[var(--ui-text-toned)]"
                  >
                    <span class="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />
                    {{ b }}
                  </li>
                </ul>
              </div>
            </article>
          </div>
        </template>

        <div
          v-if="visibleGroups.length === 0"
          class="text-center text-[var(--ui-text-muted)] py-16"
        >
          Aucune fonctionnalité pour ce filtre.
        </div>
      </div>
    </section>

    <!-- ============== DEUX ESPACES, DEUX PORTES ============== -->
    <section class="pb-20 sm:pb-28">
      <div data-reveal class="max-w-[760px] mx-auto px-6 text-center">
        <h2 class="text-2xl sm:text-3xl font-extrabold tracking-[-0.02em] mb-4">
          Deux espaces, deux portes
        </h2>
        <p class="text-[15.5px] leading-[1.6] text-[var(--ui-text-muted)]">
          Les tuteurs entrent par <code class="mock-code">/tuteur</code>, les
          alternants et les stagiaires par <code class="mock-code">/alternant</code>.
          Chacun voit son espace et rien d'autre : l'accès est vérifié à l'entrée de
          chaque route, pas laissé au hasard d'un menu.
        </p>
      </div>
    </section>

    <!-- ============== CTA ============== -->
    <section class="pb-20 sm:pb-28">
      <div class="max-w-[1200px] mx-auto px-6">
        <div
          data-reveal
          class="dark-panel rounded-[32px] px-6 py-16 sm:py-24 text-center relative overflow-hidden"
        >
          <div class="dark-panel-glow dark-panel-glow--center" aria-hidden="true" />
          <div class="relative max-w-[720px] mx-auto">
            <h2 class="text-4xl sm:text-5xl lg:text-[56px] leading-[1.05] font-extrabold tracking-[-0.03em] mb-5 text-white text-balance">
              Un compte, <span class="hl">deux espaces</span>, zéro <span class="strike">Excel
                <svg class="strike-svg" viewBox="0 0 140 28" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M4 17 Q 40 9, 72 14 T 136 11" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round" />
                </svg>
              </span>
            </h2>
            <p class="text-[17px] text-[#A8A8A6] mb-9">
              Compte gratuit, en moins de 5 minutes. Tuteur, tu invites tes alternants
              dans la foulée. Alternant ou stagiaire, tu accèdes tout de suite à ton
              espace et aux offres du jour.
            </p>
            <UButton
              :to="ctaTarget"
              color="primary"
              size="xl"
              class="rounded-full font-semibold px-8 shadow-[0_8px_24px_rgba(241,222,2,0.25)]"
            >
              Créer un compte gratuit
            </UButton>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { landingPageFor } from '~/shared/utils/auth-redirect'

definePageMeta({ auth: false })
useHead({ title: 'Fonctionnalités - Alternup' })

const { loggedIn, user } = useUserSession()

// CTA final : un visiteur connecté rejoint le landing de son espace, un
// visiteur anonyme est invité à créer un compte.
const ctaTarget = computed<string>(() =>
  loggedIn.value && user.value ? landingPageFor(user.value.role) : '/register'
)

type Audience = 'tutor' | 'learner'

const categories = [
  { id: 'all', label: 'Toutes' },
  { id: 'tutor', label: 'Tuteurs' },
  { id: 'learner', label: 'Alternants & stagiaires' }
] as const

type CatId = (typeof categories)[number]['id']
const activeCategory = ref<CatId>('all')

// ============== MOCKUPS ==============
// Petites maquettes statiques (h()) : même vocabulaire visuel dans tout le
// fichier (mockup-frame, mock-chip, badges pilule). Aucune ne lit de données
// réelles ; le contenu illustre des écrans qui existent réellement dans l'app.

type RiskKind = 'ok' | 'vigilance' | 'alerte'

function riskBadgeClass(kind: RiskKind): string {
  if (kind === 'ok') return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
  if (kind === 'vigilance') return 'bg-[#FFE9A8] text-[#6b4e00]'
  return 'bg-[#FFB4B4] text-[#7a1c1c]'
}

const riskLabels: Record<RiskKind, string> = {
  ok: 'Aucun signal',
  vigilance: 'Vigilance',
  alerte: 'Alerte'
}

const MockDashboard = () => h('div', { class: 'mockup-frame' }, [
  h('div', { class: 'mockup-toolbar' }, [
    h('span', { class: 'mockup-dot bg-[#FF5F57]' }),
    h('span', { class: 'mockup-dot bg-[#FEBC2E]' }),
    h('span', { class: 'mockup-dot bg-[#28C840]' }),
    h('span', { class: 'ml-3 text-xs text-[var(--ui-text-muted)]' }, 'alternup.app/tuteur/alternants')
  ]),
  h('div', { class: 'p-5 sm:p-7 space-y-4' }, [
    h('div', { class: 'flex items-center gap-3 mb-4' }, [
      h('div', { class: 'flex-1 rounded-full bg-[var(--ui-bg-muted)] h-9 flex items-center px-4 text-[13px] text-[var(--ui-text-muted)]' }, '🔍  Rechercher un alternant'),
      h('div', { class: 'rounded-full bg-brand-500 text-black h-9 px-4 flex items-center text-[13px] font-semibold' }, '+ Ajouter')
    ]),
    h('div', { class: 'flex flex-wrap gap-2 mb-2' }, [
      h('span', { class: 'mock-chip mock-chip-active' }, 'Cartes'),
      h('span', { class: 'mock-chip' }, 'Tableau')
    ]),
    h('div', { class: 'space-y-2.5' }, [
      mockRow('LM', 'Léa Martin', 'Alternant', 'ok', '#FFD93D'),
      mockRow('KD', 'Kevin Dubois', 'Alternant', 'vigilance', '#FFB4B4'),
      mockRow('SB', 'Sofia Bensaïd', 'Stagiaire', 'alerte', '#B4E1FF'),
      mockRow('TP', 'Thomas Petit', 'Stagiaire', 'ok', '#C9F2D1')
    ])
  ])
])

function mockRow(initials: string, name: string, role: string, kind: RiskKind, avatarBg: string) {
  return h('div', { class: 'flex items-center gap-3 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] px-3.5 py-2.5' }, [
    h('div', {
      class: 'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
      style: `background:${avatarBg};color:#1F1F1E;`
    }, initials),
    h('div', { class: 'flex-1 min-w-0 flex items-center gap-1.5' }, [
      h('span', { class: 'text-[13.5px] font-semibold truncate text-[var(--ui-text)]' }, name),
      h('span', { class: 'text-[10.5px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--ui-bg-muted)] text-[var(--ui-text-toned)] shrink-0' }, role)
    ]),
    h('span', { class: `text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${riskBadgeClass(kind)}` }, riskLabels[kind])
  ])
}

const MockAlerts = () => h('div', { class: 'mockup-frame p-5 sm:p-7 space-y-3' }, [
  h('div', { class: 'flex items-center justify-between mb-2' }, [
    h('span', { class: 'text-sm font-bold' }, 'Mes alertes'),
    h('span', { class: 'text-xs text-[var(--ui-text-muted)]' }, '3 nouvelles')
  ]),
  mockAlert('Rapport d\'étape en retard', 'Kevin Dubois : échéance dépassée de 3 jours', 'il y a 1h', '⏰'),
  mockAlert('Visite à planifier', 'Sofia Bensaïd : aucune visite prévue ce semestre', 'il y a 4h', '📅'),
  mockAlert('Mission en retard', 'Thomas Petit : échéance de mission dépassée', 'hier', '📋')
])

function mockAlert(title: string, desc: string, time: string, emoji: string) {
  return h('div', { class: 'rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-4 flex gap-3.5' }, [
    h('div', { class: 'w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center text-lg shrink-0' }, emoji),
    h('div', { class: 'flex-1 min-w-0' }, [
      h('div', { class: 'flex items-baseline justify-between gap-2' }, [
        h('strong', { class: 'text-[14px] font-bold truncate' }, title),
        h('span', { class: 'text-[11px] text-[var(--ui-text-muted)] whitespace-nowrap' }, time)
      ]),
      h('p', { class: 'text-[13px] text-[var(--ui-text-muted)] mt-0.5 leading-[1.4]' }, desc)
    ])
  ])
}

const MockNotifications = () => h('div', { class: 'mockup-frame p-5 sm:p-7 space-y-3' }, [
  h('div', { class: 'flex items-center justify-between mb-2' }, [
    h('span', { class: 'text-sm font-bold' }, 'Notifications'),
    h('span', { class: 'text-xs text-[var(--ui-text-muted)]' }, '2 non lues')
  ]),
  mockAlert('Nouveau message', 'Léa Martin t\'a envoyé un message', 'il y a 20 min', '💬'),
  mockAlert('Rapport à relire', 'Le rapport d\'étape de Kevin Dubois attend ta relecture', 'il y a 2h', '📝'),
  mockAlert('Point à caler', 'Aucune visite programmée cette semaine avec Sofia Bensaïd', 'hier', '📅')
])

const MockLivret = () => h('div', { class: 'mockup-frame p-5 sm:p-7' }, [
  h('div', { class: 'flex items-center justify-between mb-5' }, [
    h('span', { class: 'text-sm font-bold' }, 'Livret : Léa Martin'),
    h('span', { class: 'text-[11px] text-[var(--ui-text-muted)]' }, 'I2 · Alternant')
  ]),
  h('div', { class: 'grid grid-cols-3 gap-2.5' }, [
    statTile('Visites', '4', 'bg-[var(--ui-bg-muted)] text-[var(--ui-text)]'),
    statTile('Rapports', '3', 'bg-[var(--ui-bg-muted)] text-[var(--ui-text)]'),
    statTile('Bulletins', '2', 'bg-[var(--ui-bg-muted)] text-[var(--ui-text)]'),
    statTile('Compétences', '12', 'bg-[var(--ui-bg-muted)] text-[var(--ui-text)]'),
    statTile('Présences', '96 %', 'bg-[var(--ui-bg-muted)] text-[var(--ui-text)]'),
    statTile('Missions', '5/8', 'bg-[var(--ui-bg-muted)] text-[var(--ui-text)]')
  ])
])

function statTile(label: string, value: string, cls: string) {
  return h('div', { class: `rounded-xl p-3 ${cls}` }, [
    h('div', { class: 'text-[10.5px] font-semibold opacity-70' }, label),
    h('div', { class: 'text-lg font-extrabold' }, value)
  ])
}

const MockAnnonce = () => h('div', { class: 'mockup-frame p-5 sm:p-7 space-y-2.5' }, [
  h('div', { class: 'flex items-center justify-between mb-2' }, [
    h('span', { class: 'text-sm font-bold' }, 'Annonces'),
    h('span', { class: 'text-xs text-[var(--ui-text-muted)]' }, '3 diffusées')
  ]),
  mockAnnonceRow('Créneaux de visite ouverts pour juin', true, '14 / 18 lu'),
  mockAnnonceRow('Nouvelle procédure de rapport d\'étape', false, '9 / 18 lu'),
  mockAnnonceRow('Pense à mettre à jour tes présences', false, '18 / 18 lu')
])

function mockAnnonceRow(title: string, pinned: boolean, readStat: string) {
  return h('div', { class: 'rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] px-3.5 py-2.5 flex items-center gap-2.5' }, [
    h('span', { class: 'text-sm shrink-0' }, pinned ? '📌' : '📣'),
    h('span', { class: 'flex-1 min-w-0 text-[13.5px] font-medium truncate' }, title),
    h('span', { class: 'text-[11px] text-[var(--ui-text-muted)] whitespace-nowrap' }, readStat)
  ])
}

const MockInvitation = () => h('div', { class: 'mockup-frame p-5 sm:p-7 space-y-4' }, [
  h('div', { class: 'text-sm font-bold' }, 'Inviter un alternant'),
  h('div', { class: 'flex gap-2' }, [
    h('span', { class: 'mock-chip mock-chip-active' }, 'Alternant'),
    h('span', { class: 'mock-chip' }, 'Stagiaire')
  ]),
  h('div', { class: 'flex items-center gap-2 rounded-full bg-[var(--ui-bg-muted)] pl-4 pr-1.5 py-1.5' }, [
    h('span', { class: 'flex-1 min-w-0 text-[12.5px] text-[var(--ui-text-muted)] truncate' }, 'alternup.app/invite/8f3d2a1c…'),
    h('span', { class: 'rounded-full bg-brand-500 text-black text-[12px] font-semibold px-3.5 py-1.5 shrink-0' }, 'Copier')
  ]),
  h('div', { class: 'space-y-2 pt-1' }, [
    h('div', { class: 'text-[11px] font-semibold text-[var(--ui-text-muted)] uppercase tracking-wide' }, 'En attente'),
    mockPendingRow('kevin.dubois@mail.fr', 'expire dans 6 jours'),
    mockPendingRow('sofia.bensaid@mail.fr', 'expire dans 2 jours')
  ])
])

function mockPendingRow(email: string, expiry: string) {
  return h('div', { class: 'flex items-center justify-between gap-2 rounded-lg bg-[var(--ui-bg-muted)] px-3 py-2' }, [
    h('span', { class: 'text-[12.5px] font-medium truncate' }, email),
    h('span', { class: 'text-[11px] text-[var(--ui-text-muted)] whitespace-nowrap' }, expiry)
  ])
}

const MockVisit = () => h('div', { class: 'mockup-frame p-5 sm:p-7' }, [
  h('div', { class: 'flex items-center justify-between mb-4' }, [
    h('span', { class: 'text-sm font-bold' }, 'Visite tuteur : Léa Martin'),
    h('span', { class: 'text-[11px] font-semibold bg-brand-500 text-black px-2 py-0.5 rounded-full' }, 'Réalisée')
  ]),
  h('div', { class: 'grid grid-cols-2 gap-3 mb-4 text-[13px]' }, [
    h('div', { class: 'rounded-lg bg-[var(--ui-bg-muted)] p-3' }, [
      h('div', { class: 'text-[11px] text-[var(--ui-text-muted)] mb-0.5' }, 'Date'),
      h('div', { class: 'font-semibold' }, 'Jeu. 12 juin · 14h')
    ]),
    h('div', { class: 'rounded-lg bg-[var(--ui-bg-muted)] p-3' }, [
      h('div', { class: 'text-[11px] text-[var(--ui-text-muted)] mb-0.5' }, 'Mode'),
      h('div', { class: 'font-semibold' }, 'Visioconférence')
    ])
  ]),
  h('div', { class: 'space-y-3' }, [
    h('div', { class: 'rounded-lg bg-[var(--ui-bg-muted)] p-3.5' }, [
      h('div', { class: 'text-[11px] text-[var(--ui-text-muted)] mb-1' }, 'Compte rendu'),
      h('div', { class: 'h-2 rounded-full bg-[var(--ui-bg-accented)] mb-1.5' }),
      h('div', { class: 'h-2 rounded-full bg-[var(--ui-bg-accented)] w-[70%]' })
    ]),
    h('div', { class: 'rounded-lg bg-[var(--ui-bg-muted)] p-3.5' }, [
      h('div', { class: 'text-[11px] text-[var(--ui-text-muted)] mb-1' }, 'Prochaines étapes'),
      h('div', { class: 'h-2 rounded-full bg-[var(--ui-bg-accented)] w-[55%]' })
    ])
  ])
])

const MockSkills = () => h('div', { class: 'mockup-frame p-5 sm:p-7' }, [
  h('div', { class: 'flex items-center justify-between mb-5' }, [
    h('span', { class: 'text-sm font-bold' }, 'Compétences : Léa Martin'),
    h('span', { class: 'text-[11px] text-[var(--ui-text-muted)]' }, 'Mis à jour il y a 2 j')
  ]),
  h('div', { class: 'space-y-3.5' }, [
    mockSkillBar('Conception logicielle', 85),
    mockSkillBar('Communication client', 60),
    mockSkillBar('Tests automatisés', 72),
    mockSkillBar('Gestion de projet', 40)
  ])
])

function mockSkillBar(label: string, percent: number) {
  return h('div', {}, [
    h('div', { class: 'flex items-center justify-between mb-1.5' }, [
      h('span', { class: 'text-[13px] font-medium text-[var(--ui-text-toned)]' }, label),
      h('span', { class: 'text-[11.5px] font-semibold text-[var(--ui-text-muted)]' }, `${percent} %`)
    ]),
    h('div', { class: 'h-2 rounded-full bg-[var(--ui-bg-muted)] overflow-hidden' }, [
      h('div', { class: 'h-full bg-brand-500 rounded-full', style: `width:${percent}%;` })
    ])
  ])
}

const MockEvolution = () => h('div', { class: 'mockup-frame p-5 sm:p-7' }, [
  h('div', { class: 'flex items-center justify-between mb-4' }, [
    h('span', { class: 'text-sm font-bold' }, 'Mon évolution'),
    h('span', { class: 'text-[11px] text-[var(--ui-text-muted)]' }, 'Semestre 2')
  ]),
  h('div', { class: 'grid grid-cols-3 gap-2.5 mb-4' }, [
    statTile('Moyenne', '14,2/20', 'bg-brand-500 text-black'),
    statTile('Présence', '91 %', 'bg-[var(--ui-bg-muted)] text-[var(--ui-text)]'),
    statTile('Missions', '5 / 8', 'bg-[var(--ui-bg-muted)] text-[var(--ui-text)]')
  ]),
  h('div', { class: 'space-y-3.5' }, [
    mockSkillBar('Compétences acquises', 78),
    mockSkillBar('Rapports validés', 83)
  ])
])

const MockReport = () => h('div', { class: 'mockup-frame p-5 sm:p-7' }, [
  h('div', { class: 'flex items-center justify-between mb-4' }, [
    h('span', { class: 'text-sm font-bold' }, 'Rapport d\'étape S1'),
    h('span', { class: 'text-[11px] font-semibold bg-[#FFD93D] text-black px-2 py-0.5 rounded-full' }, 'Brouillon')
  ]),
  h('div', { class: 'space-y-3' }, [
    h('div', { class: 'rounded-lg bg-[var(--ui-bg-muted)] p-3.5' }, [
      h('div', { class: 'text-[11px] text-[var(--ui-text-muted)] mb-1' }, 'Missions réalisées'),
      h('div', { class: 'h-2 rounded-full bg-[var(--ui-bg-accented)] mb-1.5' }),
      h('div', { class: 'h-2 rounded-full bg-[var(--ui-bg-accented)] mb-1.5 w-[85%]' }),
      h('div', { class: 'h-2 rounded-full bg-[var(--ui-bg-accented)] w-[60%]' })
    ]),
    h('div', { class: 'rounded-lg bg-[var(--ui-bg-muted)] p-3.5' }, [
      h('div', { class: 'text-[11px] text-[var(--ui-text-muted)] mb-1' }, 'Difficultés rencontrées'),
      h('div', { class: 'h-2 rounded-full bg-[var(--ui-bg-accented)] mb-1.5 w-[70%]' }),
      h('div', { class: 'h-2 rounded-full bg-[var(--ui-bg-accented)] w-[40%]' })
    ]),
    h('div', { class: 'flex gap-2 pt-1' }, [
      h('span', { class: 'rounded-full bg-brand-500 text-black text-[12px] font-semibold px-3.5 py-1.5' }, 'Soumettre'),
      h('span', { class: 'rounded-full border border-[var(--ui-border)] text-[12px] font-medium px-3.5 py-1.5' }, 'Aperçu')
    ])
  ])
])

const MockBulletin = () => h('div', { class: 'mockup-frame p-5 sm:p-7' }, [
  h('div', { class: 'flex items-center justify-between mb-4' }, [
    h('span', { class: 'text-sm font-bold' }, 'Bulletin S1 · Léa Martin'),
    h('span', { class: 'text-[11px] font-semibold bg-brand-500 text-black px-2 py-0.5 rounded-full' }, 'Publié')
  ]),
  h('div', { class: 'rounded-lg bg-[var(--ui-bg-muted)] p-3.5 mb-3' }, [
    h('div', { class: 'text-[11px] text-[var(--ui-text-muted)] mb-1' }, 'Commentaire général'),
    h('div', { class: 'h-2 rounded-full bg-[var(--ui-bg-accented)] mb-1.5' }),
    h('div', { class: 'h-2 rounded-full bg-[var(--ui-bg-accented)] w-[65%]' })
  ]),
  h('div', { class: 'space-y-2' }, [
    mockChecklistRow('Consultable dans l\'espace alternant', true),
    mockChecklistRow('Signature électronique', true)
  ])
])

function mockChecklistRow(label: string, done: boolean) {
  return h('div', { class: 'flex items-center gap-2.5 text-[13.5px]' }, [
    h('span', {
      class: done
        ? 'w-5 h-5 rounded-full bg-brand-500 text-black flex items-center justify-center shrink-0'
        : 'w-5 h-5 rounded-full border-2 border-[var(--ui-border-accented)] shrink-0'
    }, done ? '✓' : ''),
    h('span', { class: done ? 'text-[var(--ui-text)]' : 'text-[var(--ui-text-muted)]' }, label)
  ])
}

const MockCalendar = () => h('div', { class: 'mockup-frame p-5 sm:p-7' }, [
  h('div', { class: 'flex items-center justify-between mb-4' }, [
    h('span', { class: 'text-sm font-bold' }, 'Semaine du 9 juin'),
    h('div', { class: 'flex gap-1.5' }, [
      h('span', { class: 'mock-chip' }, 'Jour'),
      h('span', { class: 'mock-chip mock-chip-active' }, 'Semaine'),
      h('span', { class: 'mock-chip' }, 'Mois'),
      h('span', { class: 'mock-chip' }, 'Liste')
    ])
  ]),
  h('div', { class: 'grid grid-cols-5 gap-2' }, [
    mockCalendarDay('Lun 9', [{ label: 'Visite Léa M.', cls: 'bg-brand-500 text-black' }]),
    mockCalendarDay('Mar 10', []),
    mockCalendarDay('Mer 11', [{ label: 'Cours DevOps', cls: 'bg-[#B4E1FF] text-[#1a4a6e]' }]),
    mockCalendarDay('Jeu 12', [{ label: 'Visite Kevin D.', cls: 'bg-brand-500 text-black' }, { label: 'Point équipe', cls: 'bg-[var(--ui-bg-accented)] text-[var(--ui-text-toned)]' }]),
    mockCalendarDay('Ven 13', [])
  ])
])

function mockCalendarDay(label: string, events: { label: string, cls: string }[]) {
  return h('div', { class: 'rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-2 min-h-[104px]' }, [
    h('div', { class: 'text-[10.5px] font-semibold text-[var(--ui-text-muted)] mb-1.5' }, label),
    ...events.map(ev => h('div', { class: `rounded-md px-1.5 py-1 mb-1 text-[10px] font-medium leading-tight ${ev.cls}` }, ev.label))
  ])
}

const MockMessaging = () => h('div', { class: 'mockup-frame p-5 sm:p-7' }, [
  h('div', { class: 'flex items-center gap-2.5 mb-4' }, [
    h('span', { class: 'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold', style: 'background:#FFD93D;color:#1F1F1E;' }, 'LM'),
    h('span', { class: 'text-sm font-bold' }, 'Léa Martin'),
    h('span', { class: 'w-1.5 h-1.5 rounded-full bg-emerald-500' })
  ]),
  h('div', { class: 'space-y-2.5 mb-4' }, [
    h('div', { class: 'max-w-[75%] rounded-2xl rounded-bl-sm bg-[var(--ui-bg-muted)] px-3.5 py-2 text-[13px]' }, 'Bonjour, je peux vous poser une question sur mon rapport ?'),
    h('div', { class: 'max-w-[75%] ml-auto rounded-2xl rounded-br-sm bg-brand-500 text-black px-3.5 py-2 text-[13px]' }, 'Bien sûr, dites-moi.'),
    h('div', { class: 'max-w-[75%] rounded-2xl rounded-bl-sm bg-[var(--ui-bg-muted)] px-3.5 py-2 text-[13px]' }, 'Le brouillon est prêt, je peux le soumettre ?')
  ]),
  h('div', { class: 'flex items-center gap-2 rounded-full bg-[var(--ui-bg-muted)] pl-4 pr-1.5 py-1.5' }, [
    h('span', { class: 'flex-1 text-[12.5px] text-[var(--ui-text-muted)]' }, 'Écrire un message…'),
    h('span', { class: 'w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-black text-[13px] font-bold shrink-0' }, '➤')
  ])
])

const MockAttendance = () => h('div', { class: 'mockup-frame p-5 sm:p-7' }, [
  h('div', { class: 'flex items-center justify-between mb-4' }, [
    h('span', { class: 'text-sm font-bold' }, 'Présences · Léa Martin'),
    h('span', { class: 'text-[11px] text-[var(--ui-text-muted)]' }, '96 % sur 30 jours')
  ]),
  h('div', { class: 'space-y-2' }, [
    mockAttendanceRow('Lun. 9 juin', 'Présent', 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'),
    mockAttendanceRow('Mar. 10 juin', 'Présent', 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'),
    mockAttendanceRow('Mer. 11 juin', 'Retard', 'bg-[#FFE9A8] text-[#6b4e00]'),
    mockAttendanceRow('Jeu. 12 juin', 'Absent', 'bg-[#FFB4B4] text-[#7a1c1c]'),
    mockAttendanceRow('Ven. 13 juin', 'Excusé', 'bg-[var(--ui-bg-muted)] text-[var(--ui-text-toned)]')
  ])
])

function mockAttendanceRow(date: string, status: string, cls: string) {
  return h('div', { class: 'flex items-center justify-between rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] px-3.5 py-2' }, [
    h('span', { class: 'text-[13px] font-medium' }, date),
    h('span', { class: `text-[11px] font-semibold px-2.5 py-1 rounded-full ${cls}` }, status)
  ])
}

const MockMissions = () => h('div', { class: 'mockup-frame p-5 sm:p-7' }, [
  h('div', { class: 'flex items-center justify-between mb-4' }, [
    h('span', { class: 'text-sm font-bold' }, 'Mes missions'),
    h('span', { class: 'text-[11px] text-[var(--ui-text-muted)]' }, '3 / 7 terminées')
  ]),
  h('div', { class: 'space-y-2.5' }, [
    mockMissionRow('Implémenter le module d\'authentification', 'done'),
    mockMissionRow('Migrer la base vers PostgreSQL 16', 'done'),
    mockMissionRow('Rédiger la doc API', 'doing'),
    mockMissionRow('Mettre en place les tests E2E', 'todo'),
    mockMissionRow('Audit de sécurité', 'todo')
  ])
])

function mockMissionRow(label: string, status: 'todo' | 'doing' | 'done') {
  const map = {
    todo: { icon: '○', cls: 'text-[var(--ui-text-muted)]', badge: 'À faire', badgeCls: 'bg-[var(--ui-bg-muted)] text-[var(--ui-text-toned)]' },
    doing: { icon: '◐', cls: 'text-[var(--ui-text)]', badge: 'En cours', badgeCls: 'bg-[#FFD93D] text-black' },
    done: { icon: '✓', cls: 'text-[var(--ui-text-muted)] line-through', badge: 'Terminée', badgeCls: 'bg-brand-500 text-black' }
  }[status]
  return h('div', { class: 'flex items-center gap-3 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] px-3.5 py-2.5' }, [
    h('span', { class: `w-5 h-5 flex items-center justify-center text-base shrink-0 ${status === 'done' ? 'text-brand-500' : 'text-[var(--ui-text-muted)]'}` }, map.icon),
    h('span', { class: `flex-1 text-[13.5px] ${map.cls}` }, label),
    h('span', { class: `text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${map.badgeCls}` }, map.badge)
  ])
}

const MockOffres = () => h('div', { class: 'mockup-frame p-5 sm:p-7' }, [
  h('div', { class: 'flex items-center gap-3 mb-3.5' }, [
    h('div', { class: 'flex-1 rounded-full bg-[var(--ui-bg-muted)] h-9 flex items-center px-4 text-[13px] text-[var(--ui-text-muted)]' }, '🔍  Développeur, Marketing…')
  ]),
  h('div', { class: 'flex flex-wrap gap-2 mb-4' }, [
    h('span', { class: 'mock-chip mock-chip-active' }, '📍 Paris'),
    h('span', { class: 'mock-chip' }, 'Apprentissage'),
    h('span', { class: 'mock-chip' }, 'Professionnalisation')
  ]),
  h('div', { class: 'space-y-2.5' }, [
    mockOffreRow('Développeur web F/H', 'Capgemini · Paris', 'vue'),
    mockOffreRow('Assistant marketing digital', 'Decathlon · Lille', 'candidate'),
    mockOffreRow('Technicien réseau', 'Orange · Lyon', 'rejetee')
  ])
])

const offreStatutMap: Record<'vue' | 'candidate' | 'rejetee', { label: string, cls: string }> = {
  vue: { label: 'Vue', cls: 'bg-[var(--ui-bg-muted)] text-[var(--ui-text-toned)]' },
  candidate: { label: 'Candidature envoyée', cls: 'bg-brand-500 text-black' },
  rejetee: { label: 'Sans suite', cls: 'bg-[#FFB4B4] text-[#7a1c1c]' }
}

function mockOffreRow(title: string, sub: string, statut: 'vue' | 'candidate' | 'rejetee') {
  const s = offreStatutMap[statut]
  return h('div', { class: 'flex items-center gap-3 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] px-3.5 py-2.5' }, [
    h('div', { class: 'flex-1 min-w-0' }, [
      h('div', { class: 'text-[13.5px] font-semibold truncate text-[var(--ui-text)]' }, title),
      h('div', { class: 'text-[12px] text-[var(--ui-text-muted)] truncate' }, sub)
    ]),
    h('span', { class: `text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 ${s.cls}` }, s.label)
  ])
}

const MockTutor = () => h('div', { class: 'mockup-frame p-5 sm:p-7' }, [
  h('div', { class: 'text-sm font-bold mb-4' }, 'Mon tuteur'),
  h('div', { class: 'flex items-center gap-3.5 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-4 mb-4' }, [
    h('span', { class: 'w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0', style: 'background:#B4E1FF;color:#1a4a6e;' }, 'JD'),
    h('div', { class: 'min-w-0' }, [
      h('div', { class: 'text-[14px] font-bold truncate' }, 'Julien Dupont'),
      h('div', { class: 'text-[12px] text-[var(--ui-text-muted)] truncate' }, 'julien.dupont@exemple.fr'),
      h('div', { class: 'text-[11px] text-[var(--ui-text-dimmed)]' }, 'Tuteur depuis le 12/09')
    ])
  ]),
  h('div', { class: 'flex gap-2' }, [
    h('span', { class: 'mock-chip' }, '💬 Messagerie'),
    h('span', { class: 'mock-chip' }, '📅 Mes visites')
  ])
])

const MockCourses = () => h('div', { class: 'mockup-frame p-5 sm:p-7' }, [
  h('div', { class: 'flex items-center justify-between mb-4' }, [
    h('span', { class: 'text-sm font-bold' }, 'Mes cours'),
    h('span', { class: 'text-[11px] text-[var(--ui-text-muted)]' }, 'I2 Software Engineering')
  ]),
  h('div', { class: 'grid grid-cols-2 gap-3 mb-4' }, [
    mockCourseSession('Architectures Web', 'Jeu. 12 juin · 9h'),
    mockCourseSession('Bases de données', 'Ven. 13 juin · 14h'),
    mockCourseSession('DevOps & CI/CD', 'Lun. 16 juin · 9h'),
    mockCourseSession('Sécurité applicative', 'Mar. 17 juin · 10h')
  ]),
  h('div', { class: 'rounded-lg bg-[var(--ui-bg-muted)] p-3.5' }, [
    h('div', { class: 'text-[11px] text-[var(--ui-text-muted)] mb-1.5' }, 'Mes notes · Architectures Web'),
    h('div', { class: 'h-2 rounded-full bg-[var(--ui-bg-accented)] mb-1.5' }),
    h('div', { class: 'h-2 rounded-full bg-[var(--ui-bg-accented)] w-[75%]' })
  ])
])

function mockCourseSession(title: string, when: string) {
  return h('div', { class: 'rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-3.5' }, [
    h('div', { class: 'text-[13.5px] font-semibold mb-0.5 text-[var(--ui-text)]' }, title),
    h('div', { class: 'text-[11.5px] text-[var(--ui-text-muted)]' }, when)
  ])
}

// ============== GROUPES DE FONCTIONNALITÉS ==============

interface Feature {
  id: string
  title: string
  description: string
  audiences: Audience[]
  mockup: ReturnType<typeof MockDashboard> extends infer R ? () => R : never
  bullets?: string[]
}
interface Group {
  id: string
  title: string
  audiences: Audience[]
  features: Feature[]
}

const groups: Group[] = [
  {
    id: 'piloter',
    title: 'Piloter ses alternants',
    audiences: ['tutor'],
    features: [
      {
        id: 'dashboard',
        title: 'Tableau de bord des alternants',
        description: 'Alternants et stagiaires dans une seule vue. Tu vois en quelques secondes qui est à jour et qui a besoin de toi.',
        audiences: ['tutor'],
        mockup: MockDashboard,
        bullets: [
          'Vue cartes ou vue tableau, au choix',
          'Niveau de risque affiché sur chaque fiche',
          'Dossier complet par apprenant, livret inclus'
        ]
      },
      {
        id: 'alerts',
        title: 'Alertes de décrochage',
        description: "Alternup calcule un score de risque par alternant et te dit qui regarder en premier, sans que tu aies à éplucher ton groupe.",
        audiences: ['tutor'],
        mockup: MockAlerts,
        bullets: [
          'Assiduité sur 30 jours et notes récentes comparées à la période précédente',
          'Rapport en retard, rapport à revoir, dernière activité sur le compte',
          "Fil de notifications et rappels dans l'application"
        ]
      },
      {
        id: 'livret',
        title: "Livret de l'alternant",
        description: 'Une page par apprenant : missions, visites, rapports, bulletins, compétences, présences. Ce que tu ouvres avant un entretien.',
        audiences: ['tutor'],
        mockup: MockLivret
      },
      {
        id: 'annonces',
        title: 'Annonces',
        description: "Un message à tes alternants d'un coup, lisible dans leur espace plutôt que noyé dans leurs mails.",
        audiences: ['tutor'],
        mockup: MockAnnonce,
        bullets: [
          'Diffusion aux alternants que tu choisis',
          'Épinglage des annonces importantes',
          'Suivi des lectures'
        ]
      },
      {
        id: 'invitations',
        title: 'Invitations et rattachement',
        description: "Tu génères un lien d'invitation, tu le transmets, l'apprenant rejoint ton espace avec le bon rôle. Il peut aussi créer son compte seul et être rattaché ensuite.",
        audiences: ['tutor'],
        mockup: MockInvitation,
        bullets: [
          'Lien d\'invitation à usage unique, révocable',
          'Rôles Alternant et Stagiaire pris en charge',
          'Attribution et retrait des apprenants suivis'
        ]
      }
    ]
  },
  {
    id: 'suivi',
    title: 'Visites, rapports et bulletins',
    audiences: ['tutor', 'learner'],
    features: [
      {
        id: 'visits',
        title: 'Visites tuteur planifiées et tracées',
        description: "Chaque visite est planifiée, documentée et archivée. Six mois plus tard, tu retrouves ce qui s'était dit.",
        audiences: ['tutor', 'learner'],
        mockup: MockVisit,
        bullets: [
          'Planification et rattachement au calendrier',
          'Compte rendu conservé avec la visite',
          'Historique complet par alternant'
        ]
      },
      {
        id: 'reports',
        title: 'Rapports d\'étape en ligne',
        description: "L'alternant rédige son rapport dans Alternup, le tuteur le relit et le valide. Plus de pièce jointe en version 3 finale bis.",
        audiences: ['tutor', 'learner'],
        mockup: MockReport,
        bullets: [
          "Brouillon sauvegardé, soumission quand c'est prêt",
          'Relecture, demande de reprise et retours du tuteur',
          'Signature électronique du rapport validé'
        ]
      },
      {
        id: 'bulletins',
        title: 'Bulletins et périodes',
        description: 'Les notes de la période, réunies dans un bulletin consultable et signable des deux côtés.',
        audiences: ['tutor', 'learner'],
        mockup: MockBulletin,
        bullets: [
          'Périodes de bulletin définies par le tuteur',
          'Consultation par l\'apprenant dans son espace',
          'Signature électronique du bulletin'
        ]
      }
    ]
  },
  {
    id: 'competences',
    title: 'Compétences et progression',
    audiences: ['tutor', 'learner'],
    features: [
      {
        id: 'skills',
        title: 'Grilles de compétences',
        description: "Tu construis tes domaines et tes compétences, puis tu évalues au fil du parcours plutôt qu'en catastrophe en fin de semestre.",
        audiences: ['tutor', 'learner'],
        mockup: MockSkills,
        bullets: [
          'Domaines et compétences créés par le tuteur',
          'Évaluations datées, progression visible dans le temps',
          'Même lecture côté tuteur et côté apprenant'
        ]
      },
      {
        id: 'evolution',
        title: 'Mon évolution',
        description: "Une page qui répond à la seule question que se pose un alternant : est-ce que j'avance ?",
        audiences: ['learner'],
        mockup: MockEvolution,
        bullets: [
          'Moyenne générale et taux de présence',
          'Missions réalisées et compétences acquises',
          'Rapports soumis et validés'
        ]
      }
    ]
  },
  {
    id: 'quotidien',
    title: 'Le quotidien partagé',
    audiences: ['tutor', 'learner'],
    features: [
      {
        id: 'calendar',
        title: 'Calendrier partagé',
        description: 'Visites, sessions de cours et échéances tombent dans le même calendrier, déplaçable à la souris.',
        audiences: ['tutor', 'learner'],
        mockup: MockCalendar,
        bullets: [
          'Glisser-déposer et redimensionnement des créneaux',
          'Vues jour, semaine, mois et liste',
          'Événements visibles des deux côtés'
        ]
      },
      {
        id: 'messaging',
        title: 'Messagerie intégrée',
        description: 'Un fil de discussion entre le tuteur et son apprenant, attaché au dossier plutôt qu\'éparpillé entre trois applications.',
        audiences: ['tutor', 'learner'],
        mockup: MockMessaging,
        bullets: [
          'Conversations tuteur ↔ apprenant',
          'Historique conservé avec le dossier',
          'Notification à la réception'
        ]
      },
      {
        id: 'attendance',
        title: 'Présences et assiduité',
        description: "L'assiduité se suit au fil de l'eau, se corrige quand c'est justifié, et se relit d'un coup d'œil.",
        audiences: ['tutor', 'learner'],
        mockup: MockAttendance,
        bullets: [
          'Saisie des présences et des absences',
          'Corrections et régularisations tracées',
          "Assiduité consultable par l'apprenant"
        ]
      },
      {
        id: 'missions',
        title: 'Projets et missions',
        description: 'Côté tuteur : créer des projets, les affecter, suivre les avancées. Côté apprenant : à faire, en cours, terminée, et une trace de ce qui a été appris.',
        audiences: ['tutor', 'learner'],
        mockup: MockMissions
      },
      {
        id: 'notifications',
        title: 'Notifications et rappels',
        description: 'Échéances, retours sur les rendus, points à programmer : un fil unique dans l\'application, côté tuteur comme côté apprenant.',
        audiences: ['tutor', 'learner'],
        mockup: MockNotifications
      }
    ]
  },
  {
    id: 'alternant',
    title: 'Espace alternant et stagiaire',
    audiences: ['learner'],
    features: [
      {
        id: 'offres',
        title: "Veille d'offres d'alternance",
        description: 'Les offres publiées sur La Bonne Alternance, récupérées chaque nuit et rangées dans ton espace.',
        audiences: ['learner'],
        mockup: MockOffres,
        bullets: [
          'Mise à jour automatique toutes les nuits',
          'Recherche par intitulé ou entreprise, filtres par lieu et type de contrat',
          'Trois statuts de candidature par offre : vue, candidature envoyée, sans suite',
          'Offres expirées écartées par défaut',
          'Aucune donnée personnelle collectée : uniquement des offres publiées'
        ]
      },
      {
        id: 'tuteur',
        title: 'Mon tuteur',
        description: 'Qui te suit, depuis quand, et comment le joindre. Une page, pas une recherche dans tes mails.',
        audiences: ['learner'],
        mockup: MockTutor,
        bullets: [
          'Fiche du ou des tuteurs rattachés',
          'Accès direct à la messagerie',
          'Raccourci vers tes visites'
        ]
      },
      {
        id: 'courses',
        title: 'Cours et notes personnelles',
        description: 'Les sessions de ta formation, avec tes notes rattachées à la bonne séance.',
        audiences: ['learner'],
        mockup: MockCourses,
        bullets: [
          'Sessions de cours créées par le tuteur',
          'Notes personnelles par session, modifiables',
          'Rattachement au calendrier'
        ]
      }
    ]
  }
]

const visibleGroups = computed(() =>
  groups
    .map(g => ({
      ...g,
      features: g.features.filter(f =>
        activeCategory.value === 'all' || f.audiences.includes(activeCategory.value as Audience)
      )
    }))
    .filter(g => g.features.length > 0)
)

// Apparition au scroll : même comportement que pages/index.vue (respect de
// prefers-reduced-motion inclus), étendu à toutes les sections de cette page.
onMounted(() => {
  const targets = document.querySelectorAll('[data-reveal]')
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    targets.forEach(el => el.classList.add('is-visible'))
    return
  }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
        io.unobserve(entry.target)
      }
    }
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })
  targets.forEach(el => io.observe(el))
  onUnmounted(() => io.disconnect())
})
</script>

<style scoped>
/* ─── Apparition au scroll ─── */
[data-reveal] {
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 0.6s ease var(--d, 0s),
    transform 0.7s cubic-bezier(0.22, 1, 0.36, 1) var(--d, 0s);
}
[data-reveal].is-visible {
  opacity: 1;
  transform: none;
}
@media (prefers-reduced-motion: reduce) {
  [data-reveal] {
    opacity: 1;
    transform: none;
    transition: none;
  }
}

/* Surlignage « marqueur » jaune (identique à pages/index.vue) */
.hl {
  position: relative;
  display: inline-block;
  padding: 0 0.12em;
  background: #F1DE02;
  color: #1F1F1E;
  border-radius: 0.14em;
  transform: rotate(-1.2deg);
  box-decoration-break: clone;
}

/* Mot barré à la main */
.strike {
  position: relative;
  display: inline-block;
  white-space: nowrap;
}
.strike-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  color: #ef4444;
  opacity: 0.9;
  pointer-events: none;
}

/* ─── Panneau sombre (CTA) ─── */
.dark-panel {
  background: #1F1F1E;
  border: 1px solid #1F1F1E;
}
.dark .dark-panel {
  background: var(--ui-bg-muted);
  border-color: var(--ui-border);
}
.dark-panel-glow {
  position: absolute;
  top: -120px;
  right: -80px;
  width: 420px;
  height: 420px;
  background: radial-gradient(closest-side, rgba(241, 222, 2, 0.14), transparent);
  pointer-events: none;
}
.dark-panel-glow--center {
  top: auto;
  right: auto;
  bottom: -180px;
  left: 50%;
  transform: translateX(-50%);
  width: 700px;
  height: 500px;
}

.mock-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9em;
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
  border-radius: 6px;
  padding: 0.1em 0.4em;
}

.mockup-frame {
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: 20px;
  overflow: hidden;
  box-shadow:
    0 1px 2px rgba(31, 31, 30, 0.04),
    0 12px 32px rgba(31, 31, 30, 0.06);
}
.mockup-toolbar {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--ui-border);
  background: var(--ui-bg-muted);
}
.mockup-dot {
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  margin-right: 6px;
}
.mock-chip {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  background: var(--ui-bg-muted);
  color: var(--ui-text-toned);
}
.mock-chip-active {
  background: var(--color-brand-500);
  color: #000;
  font-weight: 600;
}
</style>
