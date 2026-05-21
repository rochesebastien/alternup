<template>
  <div ref="rootRef" class="overflow-x-hidden">
    <!-- ============== HERO ============== -->
    <header class="relative pt-12 sm:pt-20 pb-16 sm:pb-24">
      <!-- Funnel décoratif en arrière-plan -->
      <div class="anim-funnel absolute inset-0 pointer-events-none z-0" aria-hidden="true">
        <svg
          class="w-full h-full"
          viewBox="0 0 1400 900"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="funnel-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#FFF9B0" stop-opacity="0.7" />
              <stop offset="100%" stop-color="#F9F9F9" stop-opacity="0" />
            </linearGradient>
            <linearGradient id="funnel-grad-dark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#F1DE02" stop-opacity="0.12" />
              <stop offset="100%" stop-color="#1F1F1E" stop-opacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,0 Q700,500 700,900 Q700,500 1400,0 Z"
            :fill="isDark ? 'url(#funnel-grad-dark)' : 'url(#funnel-grad)'"
          />
          <path d="M0,0 Q700,500 700,900" stroke="#F1DE02" stroke-width="1.5" fill="none" opacity="0.5" />
          <path d="M1400,0 Q700,500 700,900" stroke="#F1DE02" stroke-width="1.5" fill="none" opacity="0.5" />
        </svg>
      </div>

      <div class="relative z-10 max-w-[820px] mx-auto px-6 text-center">
        <div
          class="inline-flex items-center gap-2.5 rounded-full border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] pl-3.5 pr-5 py-2 text-sm font-medium shadow-sm mb-8"
        >
          Fait par un alternant pour les alternants
        </div>

        <h1 class="text-[40px] leading-[1.02] sm:text-6xl lg:text-[76px] font-extrabold tracking-[-0.035em] mb-7">
          Les alternants méritent mieux qu'un Excel
        </h1>

        <p class="text-lg leading-[1.55] text-[var(--ui-text-muted)] max-w-[600px] mx-auto mb-10">
          Alternup centralise le suivi de tes alternants et stagiaires.
          Visites, livrables, rapports, et compétences... tu sais qui en est où,
          et quand intervenir, et quand l'alternant a besoin de toi.
        </p>

        <div class="flex flex-col sm:flex-row gap-3 justify-center mb-16 sm:mb-20">
          <UButton
            :to="loggedIn ? '/alternants' : '/register'"
            color="primary"
            size="xl"
            class="rounded-full font-semibold px-7"
          >
            Suivre mes alternants
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            size="xl"
            to="/features"
            class="rounded-full font-semibold px-7 bg-[var(--ui-bg-elevated)]"
          >
            Comment ça marche ?
          </UButton>
        </div>

        <!-- Carte étudiant -->
        <div
          class="inline-flex items-center gap-4 bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] rounded-[20px] py-4 pl-5 pr-6 text-left shadow-[0_4px_12px_rgba(31,31,30,.06),0_12px_32px_rgba(31,31,30,.06)]"
        >
          <div
            class="w-13 h-13 rounded-full flex items-center justify-center text-2xl shrink-0"
            style="width:52px;height:52px;background:linear-gradient(135deg,#F1DE02 0%,#FFF9B0 100%);"
          >
            🎓
          </div>
          <div>
            <strong class="block text-[15px] font-bold">Léa Martin</strong>
            <div class="text-[13px] text-[var(--ui-text-muted)] mb-2">
              Master 2 — Software Engineering · Macron Corporation
            </div>
            <div class="flex flex-wrap gap-1">
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
        </div>
      </div>
    </header>

    <!-- ============== PROBLEM ============== -->
    <section class="py-16 sm:py-24">
      <div class="max-w-[1200px] mx-auto px-6">
        <div class="text-center max-w-[760px] mx-auto mb-12 sm:mb-16">
          <span class="inline-block text-xs font-bold tracking-[0.18em] uppercase bg-brand-500 text-black px-3.5 py-1.5 rounded-full mb-6">
            Le problème
          </span>
          <h2 id="product_anchor" class="text-3xl sm:text-4xl lg:text-[56px] leading-[1.05] font-extrabold tracking-[-0.03em] mb-5">
            Marre de courir après tes alternants ?
          </h2>
          <p class="text-[17px] leading-[1.55] text-[var(--ui-text-muted)] max-w-[600px] mx-auto">
            Le suivi par mail, Excel et Teams, ça tient plus.
            Centralise tes alternants au même endroit — et reprends le contrôle.
          </p>
        </div>

        <div class="bg-[var(--ui-bg-muted)] rounded-[28px] p-8 sm:p-14 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12">
          <!-- Sans -->
          <div>
            <h3 class="text-center text-lg font-bold mb-7 inline-flex items-center justify-center gap-2 w-full">
              Sans
              <span class="font-extrabold">alternup</span>
            </h3>
            <ul class="space-y-4">
              <li
                v-for="(item, i) in problems"
                :key="i"
                class="flex items-start gap-3.5 text-[15.5px] leading-[1.5]"
              >
                <span class="w-5.5 h-5.5 rounded-full bg-red-500 text-white shrink-0 flex items-center justify-center mt-0.5" style="width:22px;height:22px;">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                  </svg>
                </span>
                <span class="text-[var(--ui-text-muted)]">{{ item }}</span>
              </li>
            </ul>
          </div>

          <!-- Avec -->
          <div>
            <h3 class="text-center text-lg font-bold mb-7 inline-flex items-center justify-center gap-2 w-full">
              Avec
              <span class="font-extrabold">alternup</span>
            </h3>
            <ul class="space-y-4">
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
                <span class="text-[var(--ui-text-muted)]">
                  <strong class="text-[var(--ui-text)] font-bold mr-1">{{ item.title }}</strong>
                  — {{ item.text }}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- ============== BENEFITS ============== -->
    <section class="py-16 sm:py-24">
      <div class="max-w-[1200px] mx-auto px-6">
        <div class="text-center max-w-[760px] mx-auto mb-12 sm:mb-16">
          <span class="inline-block text-xs font-bold tracking-[0.18em] uppercase bg-brand-500 text-black px-3.5 py-1.5 rounded-full mb-6">
            Bénéfices
          </span>
          <h2 class="text-3xl sm:text-4xl lg:text-[56px] leading-[1.05] font-extrabold tracking-[-0.03em] mb-5">
            Un suivi clair, pour des alternants sereins
          </h2>
          <p class="text-[17px] leading-[1.55] text-[var(--ui-text-muted)] max-w-[600px] mx-auto">
            Du tableau de bord à l'évaluation finale, alternup t'accompagne à chaque étape du parcours de tes alternants.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Carte 1 : Search -->
          <article class="bg-[var(--ui-bg-muted)] rounded-3xl p-8 sm:p-10 flex flex-col min-h-[420px]">
            <h3 class="inline-block self-start bg-brand-500 text-black text-[17px] font-bold py-1.5 px-3 rounded-lg mb-4">
              Tous tes alternants en un coup d'œil
            </h3>
            <p class="text-[var(--ui-text-muted)] text-[15.5px] leading-[1.55] mb-8 max-w-[440px]">
              Filtre par promo, entreprise, année ou statut.
              Tu vois en quelques secondes qui est à jour et qui a besoin de toi.
            </p>
            <div class="mt-auto flex-1 flex items-center justify-center min-h-[200px]">
              <div class="w-full max-w-[420px]">
                <div class="bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] rounded-full px-5 py-3.5 flex items-center gap-2.5 text-sm text-[var(--ui-text-muted)] mb-3.5">
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
          <article class="bg-[var(--ui-bg-muted)] rounded-3xl p-8 sm:p-10 flex flex-col min-h-[420px]">
            <h3 class="inline-block self-start bg-brand-500 text-black text-[17px] font-bold py-1.5 px-3 rounded-lg mb-4">
              Sois alerté avant que ça dérape
            </h3>
            <p class="text-[var(--ui-text-muted)] text-[15.5px] leading-[1.55] mb-8 max-w-[440px]">
              Rapport en retard, visite à programmer, échéance qui approche : alternup t'alerte au bon moment, pas une semaine après.
            </p>
            <div class="mt-auto flex-1 flex items-center justify-center min-h-[200px]">
              <div class="w-full max-w-[380px] relative">
                <div class="bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] rounded-2xl p-4 sm:p-5 flex gap-3.5 items-start shadow-sm">
                  <div class="w-11 h-11 bg-brand-500 rounded-[10px] shrink-0 flex items-center justify-center">
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <path d="M3 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 4v-4H5a2 2 0 0 1-2-2V5z" stroke="#1F1F1E" stroke-width="2" stroke-linejoin="round" fill="none" />
                    </svg>
                  </div>
                  <div class="flex-1 min-w-0">
                    <span class="float-right text-xs text-[var(--ui-text-muted)] ml-2">il y a 15 min</span>
                    <strong class="block text-[14.5px] font-bold mb-1">Votre alternant veut faire un point avec vous</strong>
                    <p class="text-[var(--ui-text-muted)] text-[13.5px] leading-[1.4] m-0">
                      Léa Martin a demandé un échange — propose-lui un créneau.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <!-- Carte 3 : Network -->
          <article class="bg-[var(--ui-bg-muted)] rounded-3xl p-8 sm:p-10 flex flex-col min-h-[420px]">
            <h3 class="inline-block self-start bg-brand-500 text-black text-[17px] font-bold py-1.5 px-3 rounded-lg mb-4">
              Tes alternants, tous reliés à toi
            </h3>
            <p class="text-[var(--ui-text-muted)] text-[15.5px] leading-[1.55] mb-8 max-w-[440px]">
              Visualise toute ta promo en un graphe. Tuteur au centre, alternants autour — un clic sur un nœud, tu ouvres son dossier complet.
            </p>
            <div class="mt-auto flex-1 flex items-center justify-center min-h-[200px]">
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
                  class="absolute rounded-full bg-[#1F1F1E] flex items-center justify-center z-10"
                  style="width:70px;height:70px;left:50%;top:50%;transform:translate(-50%,-50%);border:1px solid #1F1F1E;"
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="8" r="4" stroke="#F1DE02" stroke-width="2" />
                    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="#F1DE02" stroke-width="2" stroke-linecap="round" />
                  </svg>
                </div>
              </div>
            </div>
          </article>

          <!-- Carte 4 : Algo -->
          <article class="bg-[var(--ui-bg-muted)] rounded-3xl p-8 sm:p-10 flex flex-col min-h-[420px]">
            <h3 class="inline-block self-start bg-brand-500 text-black text-[17px] font-bold py-1.5 px-3 rounded-lg mb-4">
              Une lecture des compétences qui parle
            </h3>
            <p class="text-[var(--ui-text-muted)] text-[15.5px] leading-[1.55] mb-8 max-w-[440px]">
              alternup compile les évaluations, les visites et les retours de l'entreprise pour te montrer la progression réelle — pas juste une moyenne.
            </p>
            <div class="mt-auto flex-1 flex items-center justify-center min-h-[200px]">
              <div class="w-full max-w-[380px] bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] rounded-2xl p-5 shadow-sm">
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
    <section class="py-16 sm:py-24">
      <div class="max-w-[820px] mx-auto px-6 text-center">
        <h2 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.03em] mb-5">
          Prêt à reprendre le contrôle ?
        </h2>
        <p class="text-[17px] text-[var(--ui-text-muted)] mb-8">
          Crée ton compte gratuit et commence à suivre tes alternants en moins de 5 minutes.
        </p>
        <UButton
          :to="loggedIn ? '/alternants' : '/register'"
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
definePageMeta({ auth: false })

const { loggedIn } = useUserSession()

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

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
</script>

<style scoped>
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
