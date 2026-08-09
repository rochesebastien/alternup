<template>
  <div class="overflow-x-hidden">
    <!-- ============== HERO ============== -->
    <header class="hero relative pt-14 sm:pt-24 pb-20 sm:pb-28">
      <!-- Grille pointillée + halo jaune en arrière-plan -->
      <div class="hero-bg absolute inset-0 pointer-events-none" aria-hidden="true" />

      <!-- Bulles décoratives : flottent autour du hero, attrapables à la souris -->
      <div ref="bubblesLayer" class="bubbles absolute inset-0 select-none" aria-hidden="true">
        <div
          v-for="(bubble, i) in bubbles"
          :key="i"
          class="bubble absolute"
          :class="bubble.show"
          :style="bubble.pos"
        >
          <span
            class="bubble-inner"
            :class="bubble.tone === 'brand' ? 'bubble-inner--brand' : 'bubble-inner--soft'"
            :style="{ width: bubble.size + 'px', height: bubble.size + 'px' }"
          >
            {{ bubble.label }}
          </span>
        </div>
      </div>

      <div class="relative max-w-[1200px] mx-auto px-6">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-8 items-center">
          <!-- Colonne texte -->
          <div class="lg:col-span-7 text-center lg:text-left">
            <div
              data-reveal
              class="inline-flex items-center gap-2.5 rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)]/80 backdrop-blur px-4 py-1.5 text-[13px] font-semibold shadow-sm mb-8"
            >
              <span class="relative flex w-2 h-2" aria-hidden="true">
                <span class="absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75 animate-ping" />
                <span class="relative inline-flex rounded-full w-2 h-2 bg-brand-500" />
              </span>
              Fait par un alternant pour les alternants
            </div>

            <h1
              data-reveal
              style="--d:.05s"
              class="text-[44px] leading-[1.02] sm:text-6xl xl:text-[80px] font-extrabold tracking-[-0.04em] mb-7 text-balance"
            >
              Les alternants méritent
              <span class="hl">mieux</span>
              qu'<span class="strike">un&nbsp;Excel
                <svg class="strike-svg" viewBox="0 0 140 28" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M4 17 Q 40 9, 72 14 T 136 11" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round" />
                </svg>
              </span>
            </h1>

            <p
              data-reveal
              style="--d:.1s"
              class="text-lg leading-[1.6] text-[var(--ui-text-muted)] max-w-[560px] mx-auto lg:mx-0 mb-10"
            >
              Alternup centralise le suivi de tes alternants et stagiaires.
              Visites, livrables, rapports, et compétences... tu sais qui en est où,
              et quand intervenir, et quand l'alternant a besoin de toi.
            </p>

            <div
              data-reveal
              style="--d:.15s"
              class="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
            >
              <UButton
                :to="loggedIn ? '/alternants' : '/register'"
                color="primary"
                size="xl"
                class="rounded-full font-semibold px-8 shadow-[0_8px_24px_rgba(241,222,2,0.35)] hover:shadow-[0_10px_28px_rgba(241,222,2,0.45)] transition-shadow"
              >
                Suivre mes alternants
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                size="xl"
                to="/features"
                class="rounded-full font-semibold px-8"
              >
                Comment ça marche ?
              </UButton>
            </div>
          </div>

          <!-- Colonne visuelle : collage de cartes -->
          <div class="lg:col-span-5" data-reveal style="--d:.2s">
            <div class="relative max-w-[400px] mx-auto lg:ml-auto lg:mr-0 px-4 py-8">
              <!-- Aplat jaune décalé derrière la carte -->
              <div
                class="absolute inset-6 translate-x-4 translate-y-4 rotate-3 rounded-[28px] bg-brand-500"
                aria-hidden="true"
              />

              <!-- Carte étudiant -->
              <div
                class="relative bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] rounded-[24px] p-6 -rotate-2 shadow-[0_12px_32px_rgba(31,31,30,.10),0_32px_64px_rgba(31,31,30,.10)]"
              >
                <div class="flex items-center gap-4">
                  <div
                    class="rounded-full flex items-center justify-center text-2xl shrink-0"
                    style="width:56px;height:56px;background:linear-gradient(135deg,#F1DE02 0%,#FFF9B0 100%);"
                  >
                    🎓
                  </div>
                  <div class="min-w-0">
                    <strong class="block text-[16px] font-bold">Léa Martin</strong>
                    <div class="text-[13px] text-[var(--ui-text-muted)]">
                      Master 2 Software Engineering · Macron Corporation
                    </div>
                  </div>
                </div>
                <div class="h-px bg-[var(--ui-border)] my-4" />
                <div class="flex flex-wrap gap-1.5">
                  <span class="inline-block bg-brand-500 text-black text-xs font-semibold px-2.5 py-1 rounded-full">
                    Alternance
                  </span>
                  <span class="inline-block bg-[var(--ui-bg-muted)] text-[var(--ui-text-toned)] text-xs font-medium px-2.5 py-1 rounded-full">
                    I2
                  </span>
                  <span class="inline-block bg-[var(--ui-bg-muted)] text-[var(--ui-text-toned)] text-xs font-medium px-2.5 py-1 rounded-full">
                    2ᵉ année
                  </span>
                </div>
              </div>

              <!-- Pastilles flottantes -->
              <div
                class="float-chip absolute -top-1 -right-2 rotate-6 bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] rounded-full pl-2.5 pr-3.5 py-1.5 text-[13px] font-semibold shadow-lg flex items-center gap-2"
              >
                <span class="w-2 h-2 rounded-full bg-brand-500" aria-hidden="true" />
                À jour
              </div>
              <div
                class="float-chip float-chip--slow absolute -bottom-2 -left-1 -rotate-3 bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] rounded-full px-3.5 py-1.5 text-[13px] font-bold shadow-lg text-emerald-600"
              >
                ↑ +12 %
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- ============== PROBLEM ============== -->
    <section class="py-20 sm:py-28">
      <div class="max-w-[1200px] mx-auto px-6">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-end mb-12 sm:mb-16">
          <div class="lg:col-span-7">
            <span data-reveal class="eyebrow">Le problème</span>
            <h2
              id="product_anchor"
              data-reveal
              style="--d:.05s"
              class="text-4xl sm:text-5xl lg:text-[56px] leading-[1.04] font-extrabold tracking-[-0.03em] text-balance"
            >
              Marre de courir après tes alternants ?
            </h2>
          </div>
          <p
            data-reveal
            style="--d:.1s"
            class="lg:col-span-5 text-[17px] leading-[1.6] text-[var(--ui-text-muted)] lg:pb-2"
          >
            Le suivi par mail, Excel et Teams, ça tient plus.
            Centralise tes alternants au même endroit, et reprends le contrôle.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- Sans : panneau clair, volontairement « bancal » -->
          <div
            data-reveal
            class="rounded-[24px] border border-dashed border-[var(--ui-border-accented)] bg-[var(--ui-bg-muted)] p-8 sm:p-10"
          >
            <h3 class="flex items-center gap-3 text-lg font-bold mb-8">
              <span class="w-2.5 h-2.5 rounded-full bg-red-500" aria-hidden="true" />
              Sans <span class="font-extrabold -ml-1">alternup</span>
            </h3>
            <ul class="space-y-4">
              <li
                v-for="(item, i) in problems"
                :key="i"
                class="flex items-start gap-3.5 text-[15.5px] leading-[1.5]"
              >
                <span class="rounded-full bg-red-500/10 text-red-500 shrink-0 flex items-center justify-center mt-0.5" style="width:22px;height:22px;">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                  </svg>
                </span>
                <span class="text-[var(--ui-text-muted)]">{{ item }}</span>
              </li>
            </ul>
          </div>

          <!-- Avec : panneau sombre, net -->
          <div
            data-reveal
            style="--d:.1s"
            class="dark-panel rounded-[24px] p-8 sm:p-10 relative overflow-hidden"
          >
            <div class="dark-panel-glow" aria-hidden="true" />
            <h3 class="relative flex items-center gap-3 text-lg font-bold mb-8 text-white">
              <span class="w-2.5 h-2.5 rounded-full bg-brand-500" aria-hidden="true" />
              Avec <span class="font-extrabold -ml-1">alternup</span>
            </h3>
            <ul class="relative space-y-4">
              <li
                v-for="(item, i) in benefitsList"
                :key="i"
                class="flex items-start gap-3.5 text-[15.5px] leading-[1.5]"
              >
                <span class="rounded-full bg-brand-500 text-black shrink-0 flex items-center justify-center mt-0.5" style="width:22px;height:22px;">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5L4 7L8 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
                <span class="text-[#A8A8A6]">
                  <strong class="text-white font-bold mr-1">{{ item.title }}</strong>
                  : {{ item.text }}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- ============== BENEFITS ============== -->
    <section class="py-20 sm:py-28">
      <div class="max-w-[1200px] mx-auto px-6">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-end mb-12 sm:mb-16">
          <div class="lg:col-span-7">
            <span data-reveal class="eyebrow">Bénéfices</span>
            <h2
              data-reveal
              style="--d:.05s"
              class="text-4xl sm:text-5xl lg:text-[56px] leading-[1.04] font-extrabold tracking-[-0.03em] text-balance"
            >
              Un suivi clair, pour des alternants sereins
            </h2>
          </div>
          <p
            data-reveal
            style="--d:.1s"
            class="lg:col-span-5 text-[17px] leading-[1.6] text-[var(--ui-text-muted)] lg:pb-2"
          >
            Du tableau de bord à l'évaluation finale, alternup t'accompagne à chaque étape du parcours de tes alternants.
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <!-- Carte 1 : Search (large) -->
          <article data-reveal class="bento lg:col-span-7">
            <div class="bento-head">
              <span class="bento-index">01</span>
              <h3 class="bento-title">Tous tes alternants en un coup d'œil</h3>
            </div>
            <p class="bento-text">
              Filtre par promo, entreprise, année ou statut.
              Tu vois en quelques secondes qui est à jour et qui a besoin de toi.
            </p>
            <div class="mt-auto flex-1 flex items-center justify-center min-h-[220px] pt-8">
              <div class="w-full max-w-[440px]">
                <div class="bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] rounded-full px-5 py-3.5 flex items-center gap-2.5 text-sm text-[var(--ui-text-muted)] mb-3.5 shadow-sm">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5" />
                    <path d="M11 11L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                  </svg>
                  Rechercher un alternant
                </div>
                <div class="flex flex-wrap gap-2 mb-4">
                  <span class="chip">🎓 I2</span>
                  <span class="chip">🏢 Macron Corporation</span>
                  <span class="chip">📅 2025-26</span>
                </div>
                <div class="sponsor-row">
                  <div class="avatar" style="background:#FFD93D;">
                    🎓
                  </div>
                  <span class="name">Léa Martin</span>
                  <span class="chip ml-auto">À jour</span>
                </div>
                <div class="sponsor-row">
                  <div class="avatar" style="background:#FFB4B4;">
                    🎓
                  </div>
                  <span class="name">Kevin Dubois</span>
                  <span class="chip ml-auto">Rapport dû</span>
                </div>
                <div class="sponsor-row opacity-40">
                  <div class="avatar" style="background:#c9c9c5;">
                    🎓
                  </div>
                  <span class="name">Sofia Bensaïd</span>
                  <span class="chip ml-auto">Visite à planifier</span>
                </div>
              </div>
            </div>
          </article>

          <!-- Carte 2 : Alert -->
          <article data-reveal style="--d:.05s" class="bento lg:col-span-5">
            <div class="bento-head">
              <span class="bento-index">02</span>
              <h3 class="bento-title">Sois alerté avant que ça dérape</h3>
            </div>
            <p class="bento-text">
              Rapport en retard, visite à programmer, échéance qui approche : alternup t'alerte au bon moment, pas une semaine après.
            </p>
            <div class="mt-auto flex-1 flex items-center justify-center min-h-[220px] pt-8">
              <div class="w-full max-w-[380px] relative">
                <!-- Pile de notifications suggérée -->
                <div class="absolute inset-x-4 -top-3 h-full rounded-2xl bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] opacity-40" aria-hidden="true" />
                <div class="absolute inset-x-2 -top-1.5 h-full rounded-2xl bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] opacity-70" aria-hidden="true" />
                <div class="relative bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] rounded-2xl p-4 sm:p-5 flex gap-3.5 items-start shadow-md">
                  <div class="w-11 h-11 bg-brand-500 rounded-[10px] shrink-0 flex items-center justify-center">
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <path d="M3 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4H5a2 2 0 0 1-2-2V5z" stroke="#1F1F1E" stroke-width="2" stroke-linejoin="round" fill="none" />
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <span class="float-right text-xs text-[var(--ui-text-muted)] ml-2">il y a 15 min</span>
                    <strong class="block text-[14.5px] font-bold mb-1">Votre alternant veut faire un point avec vous</strong>
                    <p class="text-[var(--ui-text-muted)] text-[13.5px] leading-[1.4] m-0">
                      Léa Martin a demandé un échange, propose-lui un créneau.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <!-- Carte 3 : Network -->
          <article data-reveal class="bento lg:col-span-5">
            <div class="bento-head">
              <span class="bento-index">03</span>
              <h3 class="bento-title">Tes alternants, tous reliés à toi</h3>
            </div>
            <p class="bento-text">
              Visualise toute ta promo en un graphe. Tuteur au centre, alternants autour. Un clic sur un nœud, tu ouvres son dossier complet.
            </p>
            <div class="mt-auto flex-1 flex items-center justify-center min-h-[220px] pt-8">
              <div class="w-full h-[260px] relative">
                <svg
                  class="absolute inset-0 w-full h-full text-[var(--ui-text-dimmed)]"
                  viewBox="0 0 400 260"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <g
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-dasharray="4 5"
                    fill="none"
                  >
                    <path d="M200,130 L80,30" />
                    <path d="M200,130 L320,30" />
                    <path d="M200,130 L20,130" />
                    <path d="M200,130 L380,130" />
                    <path d="M200,130 L90,230" />
                    <path d="M200,130 L310,230" />
                  </g>
                </svg>
                <div class="net-node" style="top:8%;left:20%;">
                  🎓
                </div>
                <div class="net-node" style="top:8%;right:20%;">
                  🎓
                </div>
                <div class="net-node" style="top:50%;left:4%;transform:translateY(-50%);">
                  🎓
                </div>
                <div class="net-node" style="top:50%;right:4%;transform:translateY(-50%);">
                  🎓
                </div>
                <div class="net-node" style="bottom:8%;left:22%;">
                  🎓
                </div>
                <div class="net-node" style="bottom:8%;right:22%;">
                  🎓
                </div>
                <div
                  class="absolute rounded-full bg-[#1F1F1E] flex items-center justify-center z-10 shadow-[0_0_0_6px_rgba(241,222,2,0.25)]"
                  style="width:70px;height:70px;left:50%;top:50%;transform:translate(-50%,-50%);"
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="#F1DE02" stroke-width="2" />
                    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="#F1DE02" stroke-width="2" stroke-linecap="round" />
                  </svg>
                </div>
              </div>
            </div>
          </article>

          <!-- Carte 4 : Compétences (large) -->
          <article data-reveal style="--d:.05s" class="bento lg:col-span-7">
            <div class="bento-head">
              <span class="bento-index">04</span>
              <h3 class="bento-title">Une lecture des compétences qui parle</h3>
            </div>
            <p class="bento-text">
              alternup compile les évaluations, les visites et les retours de l'entreprise pour te montrer la progression réelle, pas juste une moyenne.
            </p>
            <div class="mt-auto flex-1 flex items-center justify-center min-h-[220px] pt-8">
              <div class="w-full max-w-[420px] bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] rounded-2xl p-5 shadow-md">
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span
                      class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm"
                      style="background:linear-gradient(135deg,#F1DE02 0%,#FFF9B0 100%);"
                    >
                      🎓
                    </span>
                    <div class="min-w-0">
                      <div class="text-[13px] font-bold leading-tight truncate">Léa Martin</div>
                      <div class="text-[11px] text-[var(--ui-text-muted)] leading-tight">Compétences · S2</div>
                    </div>
                  </div>
                  <span class="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full whitespace-nowrap">
                    ↑ +12 %
                  </span>
                </div>

                <div
                  v-for="skill in skills"
                  :key="skill.label"
                  class="mb-3 last:mb-0"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-[12.5px] font-medium text-[var(--ui-text-toned)]">
                      {{ skill.label }}
                    </span>
                    <span class="text-[11px] font-semibold text-[var(--ui-text-muted)]">
                      {{ skill.value }} %
                    </span>
                  </div>
                  <div class="h-1.5 rounded-full bg-[var(--ui-bg-muted)] overflow-hidden">
                    <div
                      class="h-full bg-brand-500 rounded-full"
                      :style="{ width: skill.value + '%' }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ============== CTA ============== -->
    <section class="pb-20 sm:pb-28 pt-4">
      <div class="max-w-[1200px] mx-auto px-6">
        <div
          data-reveal
          class="dark-panel rounded-[32px] px-6 py-16 sm:py-24 text-center relative overflow-hidden"
        >
          <div class="dark-panel-glow dark-panel-glow--center" aria-hidden="true" />
          <div class="relative max-w-[720px] mx-auto">
            <h2 class="text-4xl sm:text-5xl lg:text-[56px] leading-[1.05] font-extrabold tracking-[-0.03em] mb-5 text-white text-balance">
              Prêt à reprendre le <span class="hl">contrôle</span> ?
            </h2>
            <p class="text-[17px] text-[#A8A8A6] mb-9">
              Crée ton compte gratuit et commence à suivre tes alternants en moins de 5 minutes.
            </p>
            <UButton
              :to="loggedIn ? '/alternants' : '/register'"
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
definePageMeta({ auth: false })

const { loggedIn } = useUserSession()

// Bulles décoratives du hero : tailles, ancrages et visibilité par breakpoint.
// Les grosses bulles sont réservées aux écrans larges pour rester dans les marges du contenu.
const bubbles = [
  { label: 'Visites', size: 96, tone: 'brand', pos: { top: '13%', left: '2.5%' }, show: 'hidden lg:block' },
  { label: 'Livrables', size: 84, tone: 'soft', pos: { bottom: '10%', left: '4%' }, show: 'hidden xl:block' },
  { label: 'Rapports', size: 78, tone: 'soft', pos: { top: '7%', right: '3.5%' }, show: 'hidden lg:block' },
  { label: 'Alertes', size: 70, tone: 'brand', pos: { bottom: '9%', right: '5%' }, show: 'hidden lg:block' },
  { label: '', size: 44, tone: 'brand', pos: { top: '40%', left: '0.5%' }, show: 'hidden md:block' },
  { label: '', size: 30, tone: 'soft', pos: { top: '5%', left: '4%' }, show: 'block' },
  { label: '', size: 24, tone: 'brand', pos: { top: '62%', right: '1%' }, show: 'hidden sm:block' }
]

const bubblesLayer = ref<HTMLElement | null>(null)

const problems = [
  "Un Excel par promo, qui n'est jamais à jour",
  "Des rapports d'étape oubliés ou rendus en retard",
  'Des visites tuteur qui tombent à la dernière minute',
  'Aucune visibilité sur les alternants en difficulté',
  'Relancer 10 fois par mail pour récupérer une signature',
  "Échanger avec le maître d'apprentissage sur 3 canaux différents",
  "Pas d'historique : on oublie ce qui s'est dit à la visite précédente",
  'Évaluer des compétences sans grille structurée',
  "Zéro vue d'ensemble en fin de semestre"
]

const benefitsList = [
  {
    title: 'Tous tes alternants dans un seul tableau de bord',
    text: "fini les Excel éclatés. Vue d'ensemble, filtres par promo, par entreprise, par statut."
  },
  {
    title: 'Alertes intelligentes',
    text: 'rapports en retard, visite à programmer, livrable manquant. Tu es prévenu avant que ça dérape.'
  },
  {
    title: 'Visites tuteur planifiées et tracées',
    text: 'un compte-rendu structuré par visite, un historique consultable, des signatures électroniques.'
  },
  {
    title: 'Suivi des compétences en continu',
    text: "grilles personnalisables, évaluations partagées avec l'entreprise, progression visible dans le temps."
  },
  {
    title: "Un point unique pour l'alternant, le tuteur et l'entreprise",
    text: 'chacun voit ce qui le concerne. Tout est partagé, rien ne se perd.'
  }
]

const skills = [
  { label: 'Conception logicielle', value: 85 },
  { label: 'Communication client', value: 62 },
  { label: 'Tests automatisés', value: 74 },
  { label: 'Gestion de projet', value: 48 }
]

// Apparition au scroll : ajoute .is-visible quand l'élément entre dans le viewport.
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

// Bulles du hero : flottement continu (désactivé si mouvement réduit) + drag via gsap Draggable.
let killBubbles: (() => void) | null = null

onMounted(async () => {
  const layer = bubblesLayer.value
  if (!layer) return

  const { $gsap: gsap } = useNuxtApp()
  // Import dynamique : Draggable ne doit être chargé que côté client.
  const { Draggable } = await import('gsap/Draggable')
  if (!bubblesLayer.value) return
  gsap.registerPlugin(Draggable)

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const items = Array.from(layer.querySelectorAll<HTMLElement>('.bubble'))
  const tweens: ReturnType<typeof gsap.to>[] = []
  const draggables: ReturnType<typeof Draggable.create> = []

  items.forEach((el, i) => {
    const inner = el.firstElementChild as HTMLElement

    // Flottement : appliqué sur la sphère interne pour ne pas écraser le drag (porté par le conteneur).
    if (!reduced) {
      tweens.push(gsap.to(inner, {
        x: gsap.utils.random(-7, 7),
        y: gsap.utils.random(-16, -8),
        duration: gsap.utils.random(3.4, 5.6),
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: i * 0.15
      }))
    }

    draggables.push(...Draggable.create(el, {
      type: 'x,y',
      trigger: inner,
      bounds: layer,
      cursor: 'grab',
      activeCursor: 'grabbing',
      onPress: () => gsap.to(inner, { scale: 1.12, duration: 0.2, ease: 'power2.out' }),
      onRelease: () => gsap.to(inner, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.65)' })
    }))
  })

  killBubbles = () => {
    draggables.forEach(d => d.kill())
    tweens.forEach(t => t.kill())
  }
})

onUnmounted(() => {
  killBubbles?.()
  killBubbles = null
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

/* ─── Hero ─── */
.hero-bg {
  background-image: radial-gradient(var(--ui-border-accented) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: radial-gradient(ellipse 80% 70% at 50% 0%, black 20%, transparent 75%);
  opacity: 0.55;
}
.hero-bg::after {
  content: '';
  position: absolute;
  top: -20%;
  left: 50%;
  transform: translateX(-50%);
  width: 900px;
  height: 600px;
  background: radial-gradient(closest-side, rgba(241, 222, 2, 0.18), transparent);
  filter: blur(20px);
}

/* Surlignage « marqueur » jaune */
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

/* Pastilles flottantes du hero */
@keyframes float-y {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -8px; }
}
.float-chip {
  animation: float-y 5s ease-in-out infinite;
}
.float-chip--slow {
  animation-duration: 7s;
  animation-delay: 1s;
}
@media (prefers-reduced-motion: reduce) {
  .float-chip {
    animation: none;
  }
}

/* ─── Bulles décoratives du hero ─── */
.bubbles {
  /* Le calque ne bloque jamais le contenu : seules les sphères captent la souris. */
  pointer-events: none;
  /* Garde les bulles (et les drags) dans le hero, pas de débordement horizontal. */
  overflow: hidden;
}
.bubble {
  will-change: transform;
}
.bubble-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  padding: 0 0.35rem;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.01em;
  text-align: center;
  pointer-events: auto;
  cursor: grab;
  will-change: transform;
}
.bubble-inner:active {
  cursor: grabbing;
}
.bubble-inner--brand {
  background: linear-gradient(140deg, rgba(241, 222, 2, 0.95) 0%, rgba(255, 249, 176, 0.9) 100%);
  color: #1F1F1E;
  box-shadow: 0 8px 24px rgba(241, 222, 2, 0.28);
}
.bubble-inner--soft {
  background: linear-gradient(140deg, var(--ui-bg-elevated) 0%, var(--ui-bg-muted) 100%);
  border: 1px solid var(--ui-border);
  color: var(--ui-text-muted);
  box-shadow: 0 8px 24px rgba(31, 31, 30, 0.08);
}

/* ─── Titres de section ─── */
.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ui-text-muted);
  margin-bottom: 1.25rem;
}
.eyebrow::before {
  content: '';
  width: 22px;
  height: 4px;
  border-radius: 999px;
  background: #F1DE02;
}

/* ─── Panneau sombre (Avec alternup + CTA) ─── */
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

/* ─── Cartes bento ─── */
.bento {
  display: flex;
  flex-direction: column;
  min-height: 440px;
  padding: 2rem;
  border-radius: 24px;
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), border-color 0.3s ease, box-shadow 0.3s ease;
}
@media (min-width: 640px) {
  .bento {
    padding: 2.5rem;
  }
}
.bento:hover {
  transform: translateY(-4px);
  border-color: var(--ui-border-accented);
  box-shadow: 0 16px 40px rgba(31, 31, 30, 0.08);
}
@media (prefers-reduced-motion: reduce) {
  .bento,
  .bento:hover {
    transform: none;
  }
}
.bento-head {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  margin-bottom: 1rem;
}
.bento-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: #F1DE02;
  color: #1F1F1E;
  font-size: 12px;
  font-weight: 800;
  flex-shrink: 0;
}
.bento-title {
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.01em;
}
.bento-text {
  color: var(--ui-text-muted);
  font-size: 15.5px;
  line-height: 1.55;
  max-width: 440px;
}

/* ─── Éléments de maquette ─── */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background: var(--ui-bg-accented);
  color: var(--ui-text-muted);
  font-size: 13px;
  padding: 0.375rem 0.75rem;
  border-radius: 999px;
}
.sponsor-row {
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  border-radius: 14px;
  padding: 0.75rem 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}
.sponsor-row .avatar {
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}
.sponsor-row .name {
  font-weight: 600;
  font-size: 14px;
  flex: 1;
  color: var(--ui-text);
}
.net-node {
  position: absolute;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 1px 2px rgba(31, 31, 30, 0.04), 0 2px 6px rgba(31, 31, 30, 0.04);
}
</style>
