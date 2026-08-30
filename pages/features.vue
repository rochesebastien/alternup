<template>
  <div class="overflow-x-hidden">
    <!-- ============== HERO ============== -->
    <section class="pt-16 sm:pt-24 pb-10 sm:pb-14">
      <div class="max-w-[820px] mx-auto px-6 text-center">
        <h1 class="text-4xl sm:text-5xl lg:text-[64px] leading-[1.05] font-extrabold tracking-[-0.035em] mb-5">
          Fonctionnalités
        </h1>
        <p class="text-lg leading-[1.55] text-[var(--ui-text-muted)] max-w-[640px] mx-auto">
          Tout ce qu'il faut pour suivre tes alternants : pour les tuteurs,
          les alternants et les écoles.
        </p>
      </div>
    </section>

    <!-- ============== FILTRES ============== -->
    <div class="px-6">
      <div
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
    <section class="pb-24 sm:pb-32">
      <div class="max-w-[1200px] mx-auto px-6">
        <template v-for="group in visibleGroups" :key="group.id">
          <h2 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-[-0.025em] mb-10 sm:mb-12">
            {{ group.title }}
          </h2>

          <div class="space-y-20 sm:space-y-28 mb-24 sm:mb-32">
            <article
              v-for="feature in group.features"
              :key="feature.id"
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

    <!-- ============== CTA ============== -->
    <section class="pb-24 sm:pb-32">
      <div class="max-w-[820px] mx-auto px-6 text-center">
        <h2 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] mb-5">
          Prêt à reprendre le contrôle ?
        </h2>
        <p class="text-[17px] text-[var(--ui-text-muted)] mb-8">
          Crée ton compte gratuit et commence à suivre tes alternants en moins de 5 minutes.
        </p>
        <UButton
          :to="ctaTarget"
          color="primary"
          size="xl"
          class="rounded-full font-semibold px-7"
        >
          Créer un compte gratuit
        </UButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { landingPageFor } from '~/shared/utils/auth-redirect'

definePageMeta({ auth: false })
useHead({ title: 'Fonctionnalités - alternup' })

const { loggedIn, user } = useUserSession()

// CTA final : un visiteur connecté rejoint le landing de son espace, un
// visiteur anonyme est invité à créer un compte.
const ctaTarget = computed<string>(() =>
  loggedIn.value && user.value ? landingPageFor(user.value.role) : '/register'
)

type Audience = 'tutor' | 'learner' | 'school'

const categories = [
  { id: 'all', label: 'Toutes' },
  { id: 'tutor', label: 'Tuteurs' },
  { id: 'learner', label: 'Alternants' },
  { id: 'school', label: 'Écoles' }
] as const

type CatId = (typeof categories)[number]['id']
const activeCategory = ref<CatId>('all')

// ============== MOCKUPS ==============

const MockDashboard = () => h('div', { class: 'mockup-frame' }, [
  h('div', { class: 'mockup-toolbar' }, [
    h('span', { class: 'mockup-dot bg-[#FF5F57]' }),
    h('span', { class: 'mockup-dot bg-[#FEBC2E]' }),
    h('span', { class: 'mockup-dot bg-[#28C840]' }),
    h('span', { class: 'ml-3 text-xs text-[var(--ui-text-muted)]' }, 'alternup.app/alternants')
  ]),
  h('div', { class: 'p-5 sm:p-7 space-y-4' }, [
    h('div', { class: 'flex items-center gap-3 mb-4' }, [
      h('div', { class: 'flex-1 rounded-full bg-[var(--ui-bg-muted)] h-9 flex items-center px-4 text-[13px] text-[var(--ui-text-muted)]' }, '🔍  Rechercher un alternant'),
      h('div', { class: 'rounded-full bg-brand-500 text-black h-9 px-4 flex items-center text-[13px] font-semibold' }, '+ Ajouter')
    ]),
    h('div', { class: 'flex flex-wrap gap-2 mb-2' }, [
      h('span', { class: 'mock-chip mock-chip-active' }, 'Tous'),
      h('span', { class: 'mock-chip' }, 'I2'),
      h('span', { class: 'mock-chip' }, 'L3'),
      h('span', { class: 'mock-chip' }, 'Macron Corporation'),
      h('span', { class: 'mock-chip' }, '2025-26')
    ]),
    h('div', { class: 'space-y-2.5' }, [
      mockRow('Léa Martin', 'I2 Software Engineering · Macron Corporation', 'À jour', 'good', '#FFD93D'),
      mockRow('Kevin Dubois', 'L3 Marketing · Globex', 'Rapport dû', 'warn', '#FFB4B4'),
      mockRow('Sofia Bensaïd', 'M1 Design · Initech', 'Visite à planifier', 'info', '#B4E1FF'),
      mockRow('Thomas Petit', 'I2 Software Engineering · Macron Corporation', 'À jour', 'good', '#C9F2D1')
    ])
  ])
])

function mockRow(name: string, role: string, badge: string, kind: 'good' | 'warn' | 'info', avatarBg: string) {
  const badgeClass = kind === 'good'
    ? 'bg-brand-500 text-black'
    : kind === 'warn'
      ? 'bg-[#FFB4B4] text-[#7a1c1c]'
      : 'bg-[#B4E1FF] text-[#1a4a6e]'
  return h('div', { class: 'flex items-center gap-3 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] px-3.5 py-2.5' }, [
    h('div', {
      class: 'w-8 h-8 rounded-full flex items-center justify-center text-[14px] shrink-0',
      style: `background:${avatarBg};`
    }, '🎓'),
    h('div', { class: 'flex-1 min-w-0' }, [
      h('div', { class: 'text-[13.5px] font-semibold truncate text-[var(--ui-text)]' }, name),
      h('div', { class: 'text-[12px] text-[var(--ui-text-muted)] truncate' }, role)
    ]),
    h('span', { class: `text-[11.5px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${badgeClass}` }, badge)
  ])
}

const MockAlerts = () => h('div', { class: 'mockup-frame p-5 sm:p-7 space-y-3' }, [
  h('div', { class: 'flex items-center justify-between mb-2' }, [
    h('span', { class: 'text-sm font-bold' }, 'Mes alertes'),
    h('span', { class: 'text-xs text-[var(--ui-text-muted)]' }, '3 nouvelles')
  ]),
  mockAlert('Rapport d\'étape en retard', 'Kevin Dubois : échéance dépassée de 3 jours', 'il y a 1h', '⏰'),
  mockAlert('Visite à planifier', 'Sofia Bensaïd : aucune visite prévue ce semestre', 'il y a 4h', '📅'),
  mockAlert('Livrable manquant', 'Thomas Petit : soutenance dans 7 jours', 'hier', '📎')
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

const MockVisit = () => h('div', { class: 'mockup-frame p-5 sm:p-7' }, [
  h('div', { class: 'flex items-center justify-between mb-4' }, [
    h('span', { class: 'text-sm font-bold' }, 'Visite tuteur : Léa Martin'),
    h('span', { class: 'text-[11px] font-semibold bg-brand-500 text-black px-2 py-0.5 rounded-full' }, 'Programmée')
  ]),
  h('div', { class: 'grid grid-cols-2 gap-3 mb-4 text-[13px]' }, [
    h('div', { class: 'rounded-lg bg-[var(--ui-bg-muted)] p-3' }, [
      h('div', { class: 'text-[11px] text-[var(--ui-text-muted)] mb-0.5' }, 'Date'),
      h('div', { class: 'font-semibold' }, 'Jeu. 12 juin · 14h')
    ]),
    h('div', { class: 'rounded-lg bg-[var(--ui-bg-muted)] p-3' }, [
      h('div', { class: 'text-[11px] text-[var(--ui-text-muted)] mb-0.5' }, 'Lieu'),
      h('div', { class: 'font-semibold' }, 'Macron Corporation · Paris')
    ])
  ]),
  h('div', { class: 'space-y-2' }, [
    mockChecklistRow('Compte-rendu maître d\'apprentissage', true),
    mockChecklistRow('Évaluation des compétences', true),
    mockChecklistRow('Signature électronique', false),
    mockChecklistRow('Envoi au service alternance', false)
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

const MockSkills = () => h('div', { class: 'mockup-frame p-5 sm:p-7' }, [
  h('div', { class: 'flex items-center justify-between mb-5' }, [
    h('span', { class: 'text-sm font-bold' }, 'Compétences : Léa Martin'),
    h('span', { class: 'text-[11px] text-[var(--ui-text-muted)]' }, 'Mis à jour il y a 2 j')
  ]),
  h('div', { class: 'space-y-3.5' }, [
    mockSkillBar('Conception logicielle', 85),
    mockSkillBar('Communication client', 60),
    mockSkillBar('Tests automatisés', 72),
    mockSkillBar('Gestion de projet', 40),
    mockSkillBar('Veille technologique', 90)
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

const MockCourses = () => h('div', { class: 'mockup-frame p-5 sm:p-7' }, [
  h('div', { class: 'flex items-center justify-between mb-4' }, [
    h('span', { class: 'text-sm font-bold' }, 'Mes cours'),
    h('span', { class: 'text-[11px] text-[var(--ui-text-muted)]' }, 'I2 Software Engineering')
  ]),
  h('div', { class: 'grid grid-cols-2 gap-3' }, [
    mockCourseCard('Architectures Web', 'Quiz · 12 questions', '8 / 12'),
    mockCourseCard('Bases de données', 'Cours · 4 chapitres', '3 / 4'),
    mockCourseCard('DevOps & CI/CD', 'Quiz · 10 questions', '10 / 10'),
    mockCourseCard('Sécurité applicative', 'Cours · 6 chapitres', '1 / 6')
  ])
])

function mockCourseCard(title: string, sub: string, progress: string) {
  const [done, total] = progress.split(' / ').map(Number)
  const pct = total ? Math.round((done! / total!) * 100) : 0
  return h('div', { class: 'rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-3.5' }, [
    h('div', { class: 'text-[13.5px] font-semibold mb-0.5 text-[var(--ui-text)]' }, title),
    h('div', { class: 'text-[11.5px] text-[var(--ui-text-muted)] mb-2.5' }, sub),
    h('div', { class: 'h-1.5 rounded-full bg-[var(--ui-bg-muted)] overflow-hidden mb-1.5' }, [
      h('div', { class: 'h-full bg-brand-500 rounded-full', style: `width:${pct}%;` })
    ]),
    h('div', { class: 'text-[11px] text-[var(--ui-text-muted)] font-medium' }, progress)
  ])
}

const MockSchoolOverview = () => h('div', { class: 'mockup-frame p-5 sm:p-7' }, [
  h('div', { class: 'flex items-center justify-between mb-4' }, [
    h('span', { class: 'text-sm font-bold' }, 'Promo I2 Software Engineering · 2025-26'),
    h('span', { class: 'text-[11px] text-[var(--ui-text-muted)]' }, '28 alternants')
  ]),
  h('div', { class: 'grid grid-cols-3 gap-3 mb-4' }, [
    statTile('À jour', '21', 'bg-brand-500 text-black'),
    statTile('Alertes', '5', 'bg-[#FFB4B4] text-[#7a1c1c]'),
    statTile('Visites dues', '3', 'bg-[#B4E1FF] text-[#1a4a6e]')
  ]),
  h('div', { class: 'rounded-xl bg-[var(--ui-bg-muted)] p-4' }, [
    h('div', { class: 'text-[11px] text-[var(--ui-text-muted)] mb-2' }, 'Taux de rapports rendus à temps'),
    h('div', { class: 'flex items-end gap-1.5 h-20' }, [
      bar(45), bar(60), bar(55), bar(70), bar(75), bar(82), bar(88)
    ]),
    h('div', { class: 'flex justify-between text-[10px] text-[var(--ui-text-muted)] mt-2' },
      ['S38', 'S42', 'S46', 'S50', 'S2', 'S6', 'S10'].map(w => h('span', {}, w))
    )
  ])
])

function statTile(label: string, value: string, cls: string) {
  return h('div', { class: `rounded-xl p-3.5 ${cls}` }, [
    h('div', { class: 'text-[11px] font-semibold opacity-80' }, label),
    h('div', { class: 'text-2xl font-extrabold' }, value)
  ])
}
function bar(h2: number) {
  return h('div', { class: 'flex-1 rounded-t-md bg-brand-500', style: `height:${h2}%;` })
}

const MockSignature = () => h('div', { class: 'mockup-frame p-5 sm:p-7' }, [
  h('div', { class: 'flex items-center justify-between mb-4' }, [
    h('span', { class: 'text-sm font-bold' }, 'Convention de stage'),
    h('span', { class: 'text-[11px] font-semibold bg-brand-500 text-black px-2 py-0.5 rounded-full' }, '3 / 3 signataires')
  ]),
  h('div', { class: 'space-y-2.5' }, [
    sigRow('École : Mme Durand', true),
    sigRow('Tuteur : M. Lopez', true),
    sigRow('Alternant : Léa Martin', true)
  ]),
  h('div', { class: 'mt-4 rounded-xl bg-[var(--ui-bg-muted)] p-3.5 text-[12px] text-[var(--ui-text-muted)] flex items-center gap-2' }, [
    h('span', {}, '🔒'),
    'Historique horodaté · conforme RGPD'
  ])
])

function sigRow(label: string, signed: boolean) {
  return h('div', { class: 'flex items-center gap-3 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] px-3.5 py-2.5' }, [
    h('span', { class: 'w-7 h-7 rounded-full bg-brand-500 text-black flex items-center justify-center text-[13px] font-bold shrink-0' }, signed ? '✓' : '…'),
    h('span', { class: 'flex-1 text-[13.5px] font-medium' }, label),
    h('span', { class: 'text-[11px] text-[var(--ui-text-muted)]' }, signed ? 'signé 12 juin' : 'en attente')
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
    audiences: ['tutor', 'school'],
    features: [
      {
        id: 'dashboard',
        title: 'Tableau de bord centralisé',
        description: "Tous tes alternants dans une seule vue : filtre par promo, entreprise, statut ou échéance. Tu vois en quelques secondes qui est à jour et qui a besoin de toi.",
        audiences: ['tutor', 'school'],
        mockup: MockDashboard,
        bullets: [
          'Filtres par promo, entreprise, année, statut',
          'Recherche instantanée par nom',
          'Codes couleur sur les états critiques'
        ]
      },
      {
        id: 'alerts',
        title: 'Alertes intelligentes',
        description: "Rapports en retard, visite à programmer, livrable manquant : alternup te prévient au bon moment, pas une semaine après que ça a dérapé.",
        audiences: ['tutor', 'school'],
        mockup: MockAlerts,
        bullets: [
          'Notifications par e-mail et in-app',
          'Seuils configurables par promo',
          'Historique des alertes consultable'
        ]
      }
    ]
  },
  {
    id: 'suivi',
    title: 'Visites & rapports',
    audiences: ['tutor', 'learner', 'school'],
    features: [
      {
        id: 'visits',
        title: 'Visites tuteur planifiées et tracées',
        description: "Un compte-rendu structuré par visite, un historique consultable, des signatures électroniques. Plus rien ne se perd entre deux semestres.",
        audiences: ['tutor', 'school'],
        mockup: MockVisit,
        bullets: [
          'Modèles de compte-rendu personnalisables',
          'Signature électronique multi-parties',
          'Historique complet par alternant'
        ]
      },
      {
        id: 'reports',
        title: 'Rapports d\'étape en ligne',
        description: "Les alternants rédigent leurs rapports directement dans alternup. Brouillons sauvegardés, structure imposée par l'école, soumission en un clic.",
        audiences: ['learner', 'tutor'],
        mockup: MockReport,
        bullets: [
          'Modèles imposés par la formation',
          'Sauvegarde automatique des brouillons',
          'Validation tuteur + maître d\'apprentissage'
        ]
      }
    ]
  },
  {
    id: 'competences',
    title: 'Compétences & progression',
    audiences: ['tutor', 'learner', 'school'],
    features: [
      {
        id: 'skills',
        title: 'Suivi des compétences en continu',
        description: "Grilles personnalisables, évaluations partagées avec l'entreprise, progression visible dans le temps. Une lecture qui parle, pas juste une moyenne.",
        audiences: ['tutor', 'learner', 'school'],
        mockup: MockSkills,
        bullets: [
          'Grilles par référentiel (RNCP, école, libre)',
          'Triple évaluation : alternant, tuteur, entreprise',
          'Visualisation de la progression au fil des semestres'
        ]
      }
    ]
  },
  {
    id: 'alternant',
    title: 'Espace alternant',
    audiences: ['learner'],
    features: [
      {
        id: 'missions',
        title: 'Mes missions au jour le jour',
        description: "Toutes tes missions au même endroit. Coche ce qui est fait, garde une trace de ce que tu as appris, utile pour ton rapport et pour ta soutenance.",
        audiences: ['learner'],
        mockup: MockMissions,
        bullets: [
          'États « à faire / en cours / terminée »',
          'Liens vers les livrables associés',
          'Export auto vers le rapport d\'étape'
        ]
      },
      {
        id: 'courses',
        title: 'Cours et quiz de la formation',
        description: "Retrouve les supports de cours, les quiz et tes notes au même endroit. Avance à ton rythme, la progression remonte automatiquement à l'école.",
        audiences: ['learner', 'school'],
        mockup: MockCourses,
        bullets: [
          'Quiz auto-corrigés',
          'Reprise à l\'endroit où tu t\'es arrêté',
          'Statistiques par module'
        ]
      }
    ]
  },
  {
    id: 'ecole',
    title: 'Vue école',
    audiences: ['school'],
    features: [
      {
        id: 'overview',
        title: 'Pilotage par promotion',
        description: "Une vue agrégée par promo : taux de rendus, alertes ouvertes, visites en retard. Tu sais où concentrer l'effort sans rouvrir 30 dossiers.",
        audiences: ['school'],
        mockup: MockSchoolOverview,
        bullets: [
          'Indicateurs clés par promo',
          'Export Excel/CSV pour les jurys',
          'Comparaison inter-promotions'
        ]
      },
      {
        id: 'compliance',
        title: 'Conformité & traçabilité',
        description: "Conventions signées électroniquement, historique horodaté, conservation conforme RGPD. Les contrôles passent sans stress.",
        audiences: ['school'],
        mockup: MockSignature,
        bullets: [
          'Signature électronique multi-parties',
          'Conservation RGPD configurable',
          'Audit log complet'
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
</script>

<style scoped>
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
