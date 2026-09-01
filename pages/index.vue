<template>
  <div class="overflow-x-hidden">
    <!-- ============== HERO ============== -->
    <header class="hero relative pt-14 sm:pt-24 pb-20 sm:pb-28">
      <!-- Grille pointillée + halo jaune en arrière-plan -->
      <div class="hero-bg absolute inset-0 pointer-events-none" aria-hidden="true" />

      <!-- Pastilles décoratives : flottent autour du hero, attrapables à la souris -->
      <div ref="pastillesLayer" class="pastilles absolute inset-0 select-none" aria-hidden="true">
        <div
          v-for="(pastille, i) in pastilles"
          :key="i"
          class="pastille absolute"
          :class="pastille.show"
          :style="pastille.pos"
        >
          <span
            class="pastille-inner bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] rounded-full shadow-lg inline-flex items-center gap-2 whitespace-nowrap"
            :class="pastille.style"
            :style="{ rotate: pastille.rot + 'deg' }"
          >
            <span
              v-if="pastille.dot"
              class="w-2 h-2 rounded-full bg-brand-500 shrink-0"
            />
            <UIcon
              v-else-if="pastille.icon"
              :name="pastille.icon"
              class="size-3.5 shrink-0 text-[var(--ui-text-dimmed)]"
            />
            {{ pastille.label }}
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
              Fait par un alternant, pour les alternants et leurs tuteurs
            </div>

            <h1
              data-reveal
              style="--d:.05s"
              class="text-[44px] leading-[1.02] sm:text-6xl xl:text-[76px] font-extrabold tracking-[-0.04em] mb-7 text-balance"
            >
              Le suivi d'alternance mérite
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
              class="text-lg leading-[1.6] text-[var(--ui-text-muted)] max-w-[560px] mx-auto lg:mx-0 mb-6"
            >
              Alternup réunit le tuteur et son apprenant au même endroit. D'un côté le
              suivi : visites, rapports, bulletins, compétences, présences. De l'autre
              la progression, les missions, et une veille d'offres d'alternance
              actualisée chaque nuit.
            </p>

            <div
              data-reveal
              style="--d:.15s"
              class="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-4"
            >
              <UButton
                :to="ctaTarget"
                color="primary"
                size="xl"
                class="rounded-full font-semibold px-8 shadow-[0_8px_24px_rgba(241,222,2,0.35)] hover:shadow-[0_10px_28px_rgba(241,222,2,0.45)] transition-shadow"
              >
                Créer mon compte
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                size="xl"
                to="/features"
                class="rounded-full font-semibold px-8"
              >
                Voir ce que fait Alternup
              </UButton>
            </div>

            <p
              data-reveal
              style="--d:.18s"
              class="text-[13px] text-[var(--ui-text-muted)]"
            >
              Gratuit. Tuteur, alternant ou stagiaire : tu choisis ton rôle à
              l'inscription, sans attendre d'invitation.
            </p>
          </div>

          <!-- Colonne visuelle : carte du roster tuteur -->
          <div class="lg:col-span-5" data-reveal style="--d:.2s">
            <div class="relative max-w-[400px] mx-auto lg:ml-auto lg:mr-0 px-4 py-8">
              <!-- Aplat jaune décalé derrière la carte -->
              <div
                class="absolute inset-6 translate-x-4 translate-y-4 rotate-3 rounded-[28px] bg-brand-500"
                aria-hidden="true"
              />

              <!-- Carte apprenant, calquée sur pages/tuteur/alternants/index.vue -->
              <div
                class="relative bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] rounded-[24px] p-6 -rotate-2 shadow-[0_12px_32px_rgba(31,31,30,.10),0_32px_64px_rgba(31,31,30,.10)]"
              >
                <div class="flex items-center gap-4">
                  <div
                    class="rounded-full flex items-center justify-center text-[17px] font-bold shrink-0"
                    style="width:56px;height:56px;background:linear-gradient(135deg,#F1DE02 0%,#FFF9B0 100%);color:#1F1F1E;"
                  >
                    LM
                  </div>
                  <div class="min-w-0">
                    <strong class="block text-[16px] font-bold">Léa Martin</strong>
                    <div class="text-[13px] text-[var(--ui-text-muted)] truncate">
                      lea.martin@exemple.fr
                    </div>
                  </div>
                </div>
                <div class="h-px bg-[var(--ui-border)] my-4" />
                <div class="flex flex-wrap gap-1.5">
                  <span class="inline-block bg-[var(--ui-bg-muted)] text-[var(--ui-text-toned)] text-xs font-medium px-2.5 py-1 rounded-full">
                    Alternant
                  </span>
                  <span class="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium px-2.5 py-1 rounded-full">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                    Suivi régulier
                  </span>
                </div>
                <div class="mt-4 text-[12px] text-[var(--ui-text-dimmed)]">
                  Ajoutée le 12/09
                </div>
              </div>

              <!-- Pastilles flottantes de la carte, draggables comme celles du hero :
                   le conteneur porte la position (et le drag GSAP, qui écrit
                   `transform`), l'intérieur garde le flottement CSS (`translate`)
                   et la rotation (`rotate`) — les trois propriétés se composent. -->
              <div class="float-chip-drag absolute -top-1 -right-2">
                <div
                  class="float-chip bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] rounded-full pl-2.5 pr-3.5 py-1.5 text-[13px] font-semibold shadow-lg flex items-center gap-2"
                  style="rotate: 6deg"
                >
                  <span class="w-2 h-2 rounded-full bg-brand-500" aria-hidden="true" />
                  À jour
                </div>
              </div>
              <div class="float-chip-drag absolute -bottom-2 -left-1">
                <div
                  class="float-chip float-chip--slow bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] rounded-full pl-2.5 pr-3.5 py-1.5 text-[13px] font-semibold shadow-lg flex items-center gap-2 text-[var(--ui-text-toned)]"
                  style="rotate: -3deg"
                >
                  <UIcon name="i-lucide-calendar" class="size-3.5 shrink-0" />
                  Visite le 14/03
                </div>
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
              Le suivi tient sur trois outils, et aucun ne se parle
            </h2>
          </div>
          <p
            data-reveal
            style="--d:.1s"
            class="lg:col-span-5 text-[17px] leading-[1.6] text-[var(--ui-text-muted)] lg:pb-2"
          >
            Mail, Excel, Teams : tant qu'un alternant va bien, ça passe. Le jour où ça
            coince, personne ne l'a vu venir.
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
              Sans <span class="font-extrabold -ml-1">Alternup</span>
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
              Avec <span class="font-extrabold -ml-1">Alternup</span>
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
                  — {{ item.text }}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- ============== DEUX ESPACES, UN MÊME DOSSIER ============== -->
    <section class="py-20 sm:py-28">
      <div class="max-w-[1200px] mx-auto px-6">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-end mb-12 sm:mb-16">
          <div class="lg:col-span-7">
            <span data-reveal class="eyebrow">Pour qui</span>
            <h2
              data-reveal
              style="--d:.05s"
              class="text-4xl sm:text-5xl lg:text-[56px] leading-[1.04] font-extrabold tracking-[-0.03em] text-balance"
            >
              Deux espaces, un même dossier
            </h2>
          </div>
          <p
            data-reveal
            style="--d:.1s"
            class="lg:col-span-5 text-[17px] leading-[1.6] text-[var(--ui-text-muted)] lg:pb-2"
          >
            Chacun entre par sa porte : le tuteur pilote, l'apprenant avance. Les deux
            lisent les mêmes visites, les mêmes rapports, les mêmes compétences.
            Personne ne réclame un export à l'autre.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- Colonne tuteur -->
          <div
            data-reveal
            class="rounded-[24px] border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-8 sm:p-10"
          >
            <h3 class="flex items-center gap-3 text-lg font-bold mb-2">
              <span class="w-2.5 h-2.5 rounded-full bg-brand-500" aria-hidden="true" />
              Pour les tuteurs
            </h3>
            <p class="text-[15px] leading-[1.5] text-[var(--ui-text-muted)] mb-7">
              Tout ce qu'un tuteur ouvre dans une semaine normale, sans changer d'outil.
            </p>
            <ul class="space-y-3.5">
              <li
                v-for="(item, i) in tutorFeatures"
                :key="i"
                class="flex items-start gap-3 text-[14.5px] leading-[1.5]"
              >
                <span class="mt-[7px] w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" aria-hidden="true" />
                <span class="text-[var(--ui-text-muted)]">
                  <strong class="text-[var(--ui-text)] font-bold">{{ item.title }}</strong>
                  — {{ item.text }}
                </span>
              </li>
            </ul>
          </div>

          <!-- Colonne alternants et stagiaires -->
          <div
            data-reveal
            style="--d:.1s"
            class="rounded-[24px] border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] p-8 sm:p-10"
          >
            <h3 class="flex items-center gap-3 text-lg font-bold mb-2">
              <span class="w-2.5 h-2.5 rounded-full bg-brand-500" aria-hidden="true" />
              Pour les alternants et les stagiaires
            </h3>
            <p class="text-[15px] leading-[1.5] text-[var(--ui-text-muted)] mb-7">
              L'espace de celui qui vit l'alternance, pas seulement de celui qui la suit.
            </p>
            <ul class="space-y-3.5">
              <li
                v-for="(item, i) in learnerFeatures"
                :key="i"
                class="flex items-start gap-3 text-[14.5px] leading-[1.5]"
              >
                <span class="mt-[7px] w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" aria-hidden="true" />
                <span class="text-[var(--ui-text-muted)]">
                  <strong class="text-[var(--ui-text)] font-bold">{{ item.title }}</strong>
                  — {{ item.text }}
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
              Ce que ça change, des deux côtés
            </h2>
          </div>
          <p
            data-reveal
            style="--d:.1s"
            class="lg:col-span-5 text-[17px] leading-[1.6] text-[var(--ui-text-muted)] lg:pb-2"
          >
            Deux cartes pour le tuteur, deux pour l'apprenant. Le même dossier derrière.
          </p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <!-- Carte 1 : Search (large) — tuteur -->
          <article data-reveal class="bento lg:col-span-7">
            <div class="bento-head">
              <span class="bento-index">01</span>
              <h3 class="bento-title">Tous tes alternants en un coup d'œil</h3>
            </div>
            <p class="bento-text">
              Alternants et stagiaires dans la même vue, en cartes ou en tableau. Un
              badge de risque sur chaque fiche : tu vois en quelques secondes qui est
              à jour, et pour qui la visite reste à programmer.
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

          <!-- Carte 2 : Alertes de décrochage — tuteur -->
          <article data-reveal style="--d:.05s" class="bento lg:col-span-5">
            <div class="bento-head">
              <span class="bento-index">02</span>
              <h3 class="bento-title">Les signaux de décrochage, avant le bilan</h3>
            </div>
            <p class="bento-text">
              Assiduité en baisse, notes en recul, rapport en retard, compte silencieux
              depuis trois semaines : Alternup calcule un score par alternant et
              remonte ceux à voir en priorité, pendant qu'il est encore temps.
            </p>
            <div class="mt-auto flex-1 flex items-center justify-center min-h-[220px] pt-8">
              <div class="w-full max-w-[380px] space-y-2.5">
                <div
                  v-for="reason in riskReasons"
                  :key="reason"
                  class="bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] rounded-2xl p-3.5 flex gap-3 items-start shadow-sm"
                >
                  <div class="w-8 h-8 bg-brand-500 rounded-[8px] shrink-0 flex items-center justify-center">
                    <UIcon name="i-lucide-triangle-alert" class="size-4 text-[#1F1F1E]" />
                  </div>
                  <p class="text-[13px] leading-[1.45] text-[var(--ui-text-toned)] m-0">
                    {{ reason }}
                  </p>
                </div>
              </div>
            </div>
          </article>

          <!-- Carte 3 : Network — apprenant -->
          <article data-reveal class="bento lg:col-span-5">
            <div class="bento-head">
              <span class="bento-index">03</span>
              <h3 class="bento-title">Ton tuteur est à un message</h3>
            </div>
            <p class="bento-text">
              Ton tuteur au centre, ton suivi autour. Une messagerie directe, des
              annonces qui ne se perdent pas dans les mails, un calendrier partagé
              pour caler le prochain point.
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

          <!-- Carte 4 : Mon évolution — apprenant (large) -->
          <article data-reveal style="--d:.05s" class="bento lg:col-span-7">
            <div class="bento-head">
              <span class="bento-index">04</span>
              <h3 class="bento-title">Ta progression, en chiffres et pas en ressenti</h3>
            </div>
            <p class="bento-text">
              Moyenne générale, taux de présence, missions terminées, compétences
              acquises, rapports validés : ton évolution se lit sur une page, à tout
              moment du semestre.
            </p>
            <div class="mt-auto flex-1 flex items-center justify-center min-h-[220px] pt-8">
              <div class="w-full max-w-[420px] bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] rounded-2xl p-5 shadow-md">
                <div class="flex items-center gap-2.5 min-w-0 mb-4">
                  <span
                    class="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm"
                    style="background:linear-gradient(135deg,#F1DE02 0%,#FFF9B0 100%);"
                  >
                    🎓
                  </span>
                  <div class="min-w-0">
                    <div class="text-[13px] font-bold leading-tight truncate">Léa Martin</div>
                    <div class="text-[11px] text-[var(--ui-text-muted)] leading-tight">Mon évolution · S2</div>
                  </div>
                </div>

                <div
                  v-for="metric in evolutionMetrics"
                  :key="metric.label"
                  class="mb-3 last:mb-0"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-[12.5px] font-medium text-[var(--ui-text-toned)]">
                      {{ metric.label }}
                    </span>
                    <span class="text-[11px] font-semibold text-[var(--ui-text-muted)]">
                      {{ metric.value }} %
                    </span>
                  </div>
                  <div class="h-1.5 rounded-full bg-[var(--ui-bg-muted)] overflow-hidden">
                    <div
                      class="h-full bg-brand-500 rounded-full"
                      :style="{ width: metric.value + '%' }"
                    />
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ============== FOCUS VEILLE D'OFFRES ============== -->
    <section class="pb-4 sm:pb-8">
      <div class="max-w-[1200px] mx-auto px-6">
        <div
          data-reveal
          class="dark-panel rounded-[32px] p-8 sm:p-14 relative overflow-hidden"
        >
          <div class="dark-panel-glow" aria-hidden="true" />
          <div class="relative grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div class="lg:col-span-6">
              <span class="inline-flex items-center gap-2.5 text-[12px] font-bold tracking-[0.18em] uppercase text-[#D8D8D5] mb-5">
                <span class="w-[22px] h-1 rounded-full bg-brand-500" aria-hidden="true" />
                Des offres sur un marché compliqué
              </span>
              <h2 class="text-3xl sm:text-4xl lg:text-[44px] leading-[1.08] font-extrabold tracking-[-0.03em] mb-5 text-white text-balance">
                Les offres d'alternance arrivent chaque jour
              </h2>
              <p class="text-[16px] leading-[1.6] text-[#A8A8A6] mb-6">
                Chaque nuit, Alternup récupère les offres d'alternance publiées sur La
                Bonne Alternance et les range dans ton espace. Le matin, tu ouvres la
                page « Offres » : c'est déjà trié, cherchable, filtrable. Tu marques
                celles où tu as postulé, et tu vois où tu en es.
              </p>
              <p class="text-[13px] leading-[1.5] text-[#8F8F8C]">
                Alternup n'aspire aucun profil ni aucune donnée personnelle : uniquement
                des offres publiées.
              </p>
            </div>

            <div class="lg:col-span-6">
              <ul class="space-y-4">
                <li
                  v-for="point in offresPoints"
                  :key="point.title"
                  class="flex items-start gap-3.5 text-[15.5px] leading-[1.5]"
                >
                  <span class="rounded-full bg-brand-500 text-black shrink-0 flex items-center justify-center mt-0.5" style="width:22px;height:22px;">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5L4 7L8 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </span>
                  <span class="text-[#A8A8A6]">
                    <strong class="text-white font-bold mr-1">{{ point.title }}</strong>
                    — {{ point.text }}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ============== CTA ============== -->
    <section class="pb-20 sm:pb-28 pt-16 sm:pt-20">
      <div class="max-w-[1200px] mx-auto px-6">
        <div
          data-reveal
          class="dark-panel rounded-[32px] px-6 py-16 sm:py-24 text-center relative overflow-hidden"
        >
          <div class="dark-panel-glow dark-panel-glow--center" aria-hidden="true" />
          <div class="relative max-w-[720px] mx-auto">
            <h2 class="text-4xl sm:text-5xl lg:text-[56px] leading-[1.05] font-extrabold tracking-[-0.03em] mb-5 text-white text-balance">
              Un lien, <span class="hl">un avenir</span>, zéro <span class="strike">Excel
                <svg class="strike-svg" viewBox="0 0 140 28" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M4 17 Q 40 9, 72 14 T 136 11" stroke="currentColor" stroke-width="4" fill="none" stroke-linecap="round" />
                </svg>
              </span>
            </h2>
            <p class="text-[17px] text-[#A8A8A6] mb-9">
              Compte gratuit, en moins de 5 minutes. Tuteur, tu invites tes alternants
              (et stagiaires). Alternant ou stagiaire, tu accèdes tout de suite à ton
              espace et aux offres du jour. Alternup solidifie alors le lien entre vous
              deux, et permet aux jeunes de mieux s'intégrer dans le milieu professionnel.
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
import { landingPageFor } from '~/shared/utils/auth-redirect'

definePageMeta({ auth: false })

const { loggedIn, user } = useUserSession()

// CTA principal : un visiteur connecté rejoint le landing de son espace, un
// visiteur anonyme est invité à créer un compte.
const ctaTarget = computed<string>(() =>
  loggedIn.value && user.value ? landingPageFor(user.value.role) : '/register'
)

// Pastilles décoratives du hero : même langage visuel que les badges « À jour » et
// « Visite le 14/03 » de la carte (pilule élevée, arrondie, ombre portée, texte
// court). Chaque pastille cite un module réel de l'application.
// Tailles et rotations légèrement variables pour un effet naturel ; ancrées vers les
// bords et réservées aux écrans larges pour ne jamais gêner le titre ni les CTA.
type HeroPastille = {
  label: string
  /** Point jaune de tête, comme le badge « À jour ». */
  dot?: boolean
  /** Alternative au point : une petite icône lucide. */
  icon?: string
  /** Rotation légère, en degrés (-6 à 6). */
  rot: number
  /** Utilitaires Tailwind de taille/couleur propres à la pastille. */
  style: string
  pos: Record<string, string>
  show: string
}

const pastilles: HeroPastille[] = [
  {
    label: 'Visites',
    dot: true,
    rot: -5,
    style: 'pl-2.5 pr-3.5 py-1.5 text-[13px] font-semibold text-[var(--ui-text-toned)]',
    pos: { top: '20%', left: '9%' },
    show: 'hidden lg:block'
  },
  {
    label: 'Rapports',
    icon: 'i-lucide-file-text',
    rot: 6,
    style: 'pl-2.5 pr-3.5 py-1.5 text-[13px] font-semibold text-[var(--ui-text-toned)]',
    pos: { top: '11%', right: '17%' },
    show: 'hidden lg:block'
  },
  {
    label: 'Présences',
    icon: 'i-lucide-clipboard-check',
    rot: -4,
    style: 'pl-2.5 pr-3 py-1 text-[12.5px] font-semibold text-[var(--ui-text-toned)]',
    pos: { bottom: '21%', right: '20%' },
    show: 'hidden lg:block'
  },
  {
    label: 'Bulletins',
    icon: 'i-lucide-file-check',
    rot: 4,
    style: 'pl-2.5 pr-3 py-1 text-[12px] font-semibold text-[var(--ui-text-toned)]',
    pos: { bottom: '26%', left: '7%' },
    show: 'hidden lg:block'
  },
  {
    label: 'Compétences',
    icon: 'i-lucide-target',
    rot: 3,
    style: 'pl-2.5 pr-3 py-1 text-[12px] font-semibold text-[var(--ui-text-toned)]',
    pos: { top: '42%', right: '5%' },
    show: 'hidden xl:block'
  },
  {
    label: 'Offres',
    icon: 'i-lucide-search',
    rot: -6,
    style: 'pl-2.5 pr-3.5 py-1.5 text-[13px] font-semibold text-[var(--ui-text-toned)]',
    pos: { top: '48%', left: '6.5%' },
    show: 'hidden xl:block'
  },
  {
    label: 'Messages',
    icon: 'i-lucide-message-circle',
    rot: 5,
    style: 'pl-2.5 pr-3 py-1 text-[12px] font-semibold text-[var(--ui-text-toned)]',
    pos: { top: '68%', right: '9%' },
    show: 'hidden xl:block'
  },
  {
    label: 'Calendrier',
    icon: 'i-lucide-calendar',
    rot: -3,
    style: 'pl-2.5 pr-3 py-1 text-[12px] font-semibold text-[var(--ui-text-toned)]',
    pos: { top: '72%', left: '11%' },
    show: 'hidden xl:block'
  }
]

const pastillesLayer = ref<HTMLElement | null>(null)

const problems = [
  "Un fichier de suivi qui n'est jamais à jour au bon moment",
  "Des rapports d'étape rendus en retard, ou pas rendus",
  'Des visites calées la veille, et aucune trace le lendemain',
  "Aucun signal quand un alternant commence à décrocher : tu l'apprends au bilan",
  'Des relances par mail pour obtenir une signature',
  'Des échanges éclatés entre mail, Teams et SMS',
  'Des présences notées sur une feuille qui se perd',
  'Des compétences évaluées de mémoire, en fin de semestre',
  'Et côté apprenant : chercher son alternance seul, sur dix sites, sans savoir où il a déjà postulé'
]

const benefitsList = [
  {
    title: 'Un dossier par apprenant',
    text: 'visites, rapports, bulletins, compétences, présences et missions au même endroit.'
  },
  {
    title: 'Des signaux avant le bilan',
    text: "un score de décrochage calculé sur l'assiduité des 30 derniers jours, les notes récentes comparées à la période précédente, les rapports en retard et la dernière activité."
  },
  {
    title: 'Des visites qui laissent une trace',
    text: 'planifiées dans le calendrier, compte rendu conservé, historique complet par alternant.'
  },
  {
    title: 'Rapports et bulletins signés en ligne',
    text: 'brouillon, soumission, revue du tuteur, signature électronique. Plus de pièce jointe en version 3 finale bis.'
  },
  {
    title: 'Un seul canal',
    text: 'messagerie, annonces et calendrier partagés entre le tuteur et son apprenant.'
  },
  {
    title: 'Côté apprenant',
    text: "sa progression chiffrée, et des offres d'alternance mises à jour chaque nuit."
  }
]

const tutorFeatures = [
  {
    title: 'Tableau de bord des alternants',
    text: 'alternants et stagiaires dans la même vue, en cartes ou en tableau, avec le niveau de risque affiché sur chaque fiche.'
  },
  {
    title: 'Alertes de décrochage',
    text: 'assiduité, notes récentes, rapports en retard : le score remonte qui appeler cette semaine.'
  },
  {
    title: "Livret de l'alternant",
    text: "le dossier complet d'un apprenant, sur une page, à ouvrir avant un entretien."
  },
  {
    title: 'Visites tuteur',
    text: 'planification, compte rendu, historique par alternant.'
  },
  {
    title: "Rapports d'étape",
    text: 'relecture, retours, validation et signature.'
  },
  {
    title: 'Bulletins',
    text: 'périodes de bulletin, notes, signature en ligne.'
  },
  {
    title: 'Compétences',
    text: 'tes propres domaines et grilles, évalués au fil du parcours.'
  },
  {
    title: 'Présences',
    text: 'saisie, corrections tracées, vue par période.'
  },
  {
    title: 'Projets et missions',
    text: 'tu crées, tu affectes, tu suis les avancées.'
  },
  {
    title: 'Annonces',
    text: 'un message à tes alternants, épinglé si besoin, avec le suivi des lectures.'
  },
  {
    title: 'Cours',
    text: 'les sessions de formation posées au calendrier.'
  },
  {
    title: 'Calendrier et messagerie',
    text: 'les créneaux et les échanges au même endroit que le dossier.'
  }
]

const learnerFeatures = [
  {
    title: "Veille d'offres d'alternance",
    text: 'les offres publiées, récupérées chaque nuit, avec recherche, filtres et suivi de tes candidatures.'
  },
  {
    title: 'Mon évolution',
    text: 'moyenne générale, taux de présence, missions, compétences acquises, rapports validés.'
  },
  {
    title: 'Mon tuteur',
    text: 'qui te suit, depuis quand, et comment le joindre, en une page.'
  },
  {
    title: "Mes rapports d'étape",
    text: 'rédigés en ligne, brouillon sauvegardé, soumis quand tu es prêt.'
  },
  {
    title: 'Mes bulletins',
    text: 'consultés et signés depuis ton espace.'
  },
  {
    title: 'Mes missions',
    text: 'ce que tu as à faire, où tu en es, ce que tu en retiens.'
  },
  {
    title: 'Mes compétences',
    text: 'la grille de ton tuteur, et ta progression dessus.'
  },
  {
    title: 'Mes visites',
    text: 'les points programmés avec ton tuteur, et ceux déjà passés.'
  },
  {
    title: 'Cours et notes personnelles',
    text: 'les sessions de ta formation, avec tes notes rattachées à la bonne séance.'
  },
  {
    title: 'Présences',
    text: 'ton assiduité, sans avoir à la demander.'
  },
  {
    title: 'Annonces',
    text: 'ce que ton tuteur publie, hors de ta boîte mail.'
  },
  {
    title: 'Calendrier et messagerie',
    text: 'tes créneaux, et un fil direct avec ton tuteur.'
  }
]

// Libellés repris mot pour mot de shared/utils/risk.ts (raisons du score de risque).
const riskReasons = [
  '3 absences non excusées sur les 30 derniers jours (12 % des sessions).',
  "Dernier rapport d'étape soumis il y a 41 jours.",
  'Notes en baisse : 11,5/20 sur 30 jours contre 14,2/20 sur la période précédente.'
]

const evolutionMetrics = [
  { label: 'Compétences acquises', value: 78 },
  { label: 'Assiduité', value: 91 },
  { label: 'Missions terminées', value: 60 },
  { label: 'Rapports validés', value: 83 }
]

const offresPoints = [
  {
    title: 'Actualisé chaque nuit',
    text: "l'ingestion tourne toute seule, personne n'a à cliquer."
  },
  {
    title: 'Recherche et filtres',
    text: 'par intitulé ou entreprise, par lieu, par type de contrat. Les offres expirées sont écartées par défaut.'
  },
  {
    title: 'Tes candidatures suivies',
    text: 'trois statuts par offre : vue, candidature envoyée, sans suite. Plus de tableur à côté.'
  }
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

// Pastilles du hero : flottement continu (désactivé si mouvement réduit) + drag via gsap Draggable.
let killPastilles: (() => void) | null = null

onMounted(async () => {
  const layer = pastillesLayer.value
  if (!layer) return

  const { $gsap: gsap } = useNuxtApp()
  // Import dynamique : Draggable ne doit être chargé que côté client.
  const { Draggable } = await import('gsap/Draggable')
  if (!pastillesLayer.value) return
  gsap.registerPlugin(Draggable)

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const items = Array.from(layer.querySelectorAll<HTMLElement>('.pastille'))
  const tweens: ReturnType<typeof gsap.to>[] = []
  const draggables: ReturnType<typeof Draggable.create> = []

  // Drag commun (pastilles du hero et badges de la carte) : le conteneur est
  // déplacé, l'élément interne sert de poignée et reçoit l'effet de saisie.
  function makeDraggable(el: HTMLElement) {
    const inner = el.firstElementChild as HTMLElement
    draggables.push(...Draggable.create(el, {
      type: 'x,y',
      trigger: inner,
      bounds: layer,
      cursor: 'grab',
      activeCursor: 'grabbing',
      onPress: () => gsap.to(inner, { scale: 1.08, duration: 0.2, ease: 'power2.out' }),
      onRelease: () => gsap.to(inner, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.65)' })
    }))
  }

  items.forEach((el, i) => {
    const inner = el.firstElementChild as HTMLElement

    // Flottement : appliqué sur la pastille interne pour ne pas écraser le drag (porté par le conteneur).
    // La rotation reste sur la propriété CSS `rotate`, que gsap ne touche pas (il n'écrit que `transform`).
    if (!reduced) {
      tweens.push(gsap.to(inner, {
        x: gsap.utils.random(-6, 6),
        y: gsap.utils.random(-12, -6),
        duration: gsap.utils.random(3.4, 5.6),
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: i * 0.15
      }))
    }

    makeDraggable(el)
  })

  // Badges de la carte étudiant (« À jour », « Visite le 14/03 ») : leur flottement
  // reste en CSS (propriété `translate`), le drag s'y compose sans conflit.
  document
    .querySelectorAll<HTMLElement>('.float-chip-drag')
    .forEach((el) => makeDraggable(el))

  killPastilles = () => {
    draggables.forEach(d => d.kill())
    tweens.forEach(t => t.kill())
  }
})

onUnmounted(() => {
  killPastilles?.()
  killPastilles = null
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
.float-chip-drag {
  will-change: transform;
}
.float-chip {
  animation: float-y 5s ease-in-out infinite;
  cursor: grab;
}
.float-chip:active {
  cursor: grabbing;
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

/* ─── Pastilles décoratives du hero ─── */
.pastilles {
  /* Le calque ne bloque jamais le contenu : seules les pastilles captent la souris. */
  pointer-events: none;
  /* Garde les pastilles (et les drags) dans le hero, pas de débordement horizontal. */
  overflow: hidden;
}
.pastille {
  will-change: transform;
}
/* L'apparence (fond élevé, bordure, rounded-full, ombre, tailles) est portée par les
   utilitaires Tailwind du template, calqués sur les badges « À jour » / « Visite le 14/03 ». */
.pastille-inner {
  pointer-events: auto;
  cursor: grab;
  letter-spacing: 0.01em;
  will-change: transform;
}
.pastille-inner:active {
  cursor: grabbing;
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

/* ─── Panneau sombre (Avec Alternup + focus offres + CTA) ─── */
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
