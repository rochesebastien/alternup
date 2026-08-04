// Vue 360° de l'alternant — types partagés et présentation de la timeline.
//
// Module PUR : aucune dépendance Prisma / runtime serveur (littéraux de chaîne
// uniquement). L'agrégation des données vit dans
// `server/api/users/[id]/overview.get.ts` ; ce fichier ne contient que le
// contrat de réponse, les libellés FR et la fusion/tri des événements — donc
// tout ce qui est testable sans base de données.

// ─────────────────────────── Timeline ───────────────────────────

/** Nature d'un événement de la timeline unifiée. */
export type OverviewEventType =
  | 'note'
  | 'retour_mission'
  | 'rapport'
  | 'visite'
  | 'absence'
  | 'bulletin'
  | 'competence'

export interface OverviewEvent {
  /** Clé de rendu, unique au sein de la timeline (préfixée par le type). */
  id: string
  /** Date ISO de l'événement (celle qui fait foi pour le tri). */
  date: string
  type: OverviewEventType
  title: string
  description?: string | null
  /** Lien interne vers le module concerné, `null` si aucun écran dédié. */
  link?: string | null
}

export interface OverviewEventMeta {
  label: string
  /** Nom d'icône `i-lucide-*`. */
  icon: string
  /** Couleur sémantique NuxtUI (UBadge / UIcon). */
  color: 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'error'
}

export const OVERVIEW_EVENT_META: Record<OverviewEventType, OverviewEventMeta> = {
  note: { label: 'Note', icon: 'i-lucide-notebook-pen', color: 'info' },
  retour_mission: {
    label: 'Retour de mission',
    icon: 'i-lucide-briefcase',
    color: 'neutral'
  },
  rapport: { label: "Rapport d'étape", icon: 'i-lucide-file-text', color: 'primary' },
  visite: { label: 'Visite', icon: 'i-lucide-map-pin', color: 'neutral' },
  absence: { label: 'Assiduité', icon: 'i-lucide-user-x', color: 'error' },
  bulletin: { label: 'Bulletin', icon: 'i-lucide-graduation-cap', color: 'success' },
  competence: { label: 'Compétence', icon: 'i-lucide-target', color: 'info' }
}

const FALLBACK_EVENT_META: OverviewEventMeta = {
  label: 'Événement',
  icon: 'i-lucide-circle-dot',
  color: 'neutral'
}

/** Métadonnées d'affichage d'un type ; retombe sur un défaut neutre si inconnu. */
export function overviewEventMeta(type: string): OverviewEventMeta {
  return OVERVIEW_EVENT_META[type as OverviewEventType] ?? FALLBACK_EVENT_META
}

export function overviewEventLabel(type: string): string {
  return overviewEventMeta(type).label
}

export function overviewEventIcon(type: string): string {
  return overviewEventMeta(type).icon
}

/** Nombre d'événements conservés dans la timeline d'une fiche. */
export const OVERVIEW_TIMELINE_LIMIT = 50

/**
 * Fusionne les différentes sources d'événements en une timeline unique triée du
 * plus récent au plus ancien, puis tronquée. Les dates invalides sont écartées
 * (une source vide ou corrompue ne doit pas casser la fiche). À date égale, le
 * tri retombe sur l'`id` pour rester déterministe entre deux rendus.
 */
export function mergeTimeline(
  sources: Array<OverviewEvent[] | null | undefined>,
  limit: number = OVERVIEW_TIMELINE_LIMIT
): OverviewEvent[] {
  const all: Array<{ event: OverviewEvent; time: number }> = []

  for (const source of sources) {
    if (!source) continue
    for (const event of source) {
      const time = new Date(event.date).getTime()
      if (Number.isNaN(time)) continue
      all.push({ event, time })
    }
  }

  all.sort((a, b) => b.time - a.time || a.event.id.localeCompare(b.event.id))

  return all.slice(0, Math.max(0, limit)).map((entry) => entry.event)
}

// ─────────────────────────── Échéances à venir ───────────────────────────

export type OverviewUpcomingType = 'visite' | 'session'

export interface OverviewUpcoming {
  id: string
  date: string
  type: OverviewUpcomingType
  title: string
  description?: string | null
  link?: string | null
}

export const OVERVIEW_UPCOMING_META: Record<OverviewUpcomingType, OverviewEventMeta> = {
  visite: { label: 'Visite', icon: 'i-lucide-map-pin', color: 'neutral' },
  session: { label: 'Session', icon: 'i-lucide-calendar-clock', color: 'neutral' }
}

export function overviewUpcomingMeta(type: string): OverviewEventMeta {
  return OVERVIEW_UPCOMING_META[type as OverviewUpcomingType] ?? FALLBACK_EVENT_META
}

/** Nombre d'échéances affichées dans la colonne « À venir ». */
export const OVERVIEW_UPCOMING_LIMIT = 5

/**
 * Fusionne les échéances à venir (visites planifiées, sessions) du plus proche
 * au plus lointain. Même robustesse que `mergeTimeline` : dates invalides
 * écartées, tri déterministe à date égale.
 */
export function mergeUpcoming(
  sources: Array<OverviewUpcoming[] | null | undefined>,
  limit: number = OVERVIEW_UPCOMING_LIMIT
): OverviewUpcoming[] {
  const all: Array<{ item: OverviewUpcoming; time: number }> = []

  for (const source of sources) {
    if (!source) continue
    for (const item of source) {
      const time = new Date(item.date).getTime()
      if (Number.isNaN(time)) continue
      all.push({ item, time })
    }
  }

  all.sort((a, b) => a.time - b.time || a.item.id.localeCompare(b.item.id))

  return all.slice(0, Math.max(0, limit)).map((entry) => entry.item)
}

// ─────────────────────────── Formatage FR ───────────────────────────

/** Note sur 20 au format français (« 14,2/20 »), ou tiret si absente. */
export function formatGrade20(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-'
  return `${(Math.round(value * 10) / 10).toString().replace('.', ',')}/20`
}

/** Pourcentage entier (« 87 % »), ou tiret si absent. */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-'
  return `${Math.round(value)} %`
}

// ─────────────────────────── Contrat de réponse ───────────────────────────

export interface OverviewMissionCount {
  status: string
  label: string
  count: number
}

export interface OverviewKpis {
  /** Moyenne générale des notes sur 20, `null` si aucune note. */
  avgGrade: number | null
  /** Taux de présence en %, `null` si aucun pointage. */
  attendanceRate: number | null
  /** Sessions pointées ayant servi au calcul du taux. */
  attendanceRecorded: number
  missions: OverviewMissionCount[]
  missionsTotal: number
  /** % de compétences acquises ou maîtrisées, `null` si aucun référentiel. */
  competencyRate: number | null
  competencyTotal: number
  validatedReports: number
}

export interface OverviewStudent {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  /** Date d'ajout au réseau du tuteur, `null` si le lien est introuvable. */
  addedAt: string | null
}

export interface OverviewRisk {
  score: number
  level: string
  reasons: string[]
}

export interface OverviewLinks {
  reports: string
  reportCards: string
  competencies: string
  visits: string
  /** Fil de discussion dédié, `null` si aucune conversation n'existe. */
  conversation: string | null
}

export interface StudentOverview {
  student: OverviewStudent
  kpis: OverviewKpis
  risk: OverviewRisk
  timeline: OverviewEvent[]
  upcoming: OverviewUpcoming[]
  links: OverviewLinks
}
