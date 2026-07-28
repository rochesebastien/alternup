// Score de risque de décrochage (early warning).
//
// Module PUR : aucune dépendance Prisma / runtime serveur. Les métriques sont
// collectées côté serveur (`server/utils/risk.ts`) puis passées à
// `computeRiskScore`, ce qui rend la pondération testable et affichable.
//
// ─────────────────────────── Pondération ───────────────────────────
// Le score va de 0 (aucun signal) à 100 (cumul de tous les signaux).
// Chaque famille de signaux a un plafond, la somme des plafonds vaut 100 :
//
//   | Signal                                   | Plafond |
//   |------------------------------------------|---------|
//   | Absences non excusées (30 j)             |   25    |
//   | Retards (30 j)                           |   10    |
//   | Ancienneté du dernier rapport soumis     |   20    |
//   | Rapports « à revoir » non re-soumis      |   15    |
//   | Tendance des notes (30 j vs 30 j préc.)  |   20    |
//   | Inactivité (note / retour de mission)    |   10    |
//   |------------------------------------------|---------|
//   | Total                                    |  100    |
//
// Seuils : ok < 40 · vigilance 40–69 · alerte >= 70.

export type RiskLevel = 'ok' | 'vigilance' | 'alerte'

/** Score minimal pour passer en « vigilance ». */
export const RISK_VIGILANCE_THRESHOLD = 40
/** Score minimal pour passer en « alerte ». */
export const RISK_ALERTE_THRESHOLD = 70

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  ok: 'Aucun signal',
  vigilance: 'Vigilance',
  alerte: 'Alerte'
}

export function riskLevelLabel(level: RiskLevel): string {
  return RISK_LEVEL_LABELS[level]
}

/** Couleur UBadge par niveau (sémantique NuxtUI). */
export function riskLevelColor(level: RiskLevel): 'success' | 'warning' | 'error' {
  switch (level) {
    case 'ok':
      return 'success'
    case 'vigilance':
      return 'warning'
    default:
      return 'error'
  }
}

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= RISK_ALERTE_THRESHOLD) return 'alerte'
  if (score >= RISK_VIGILANCE_THRESHOLD) return 'vigilance'
  return 'ok'
}

/** Plafonds de points par famille de signaux (somme = 100). */
export const RISK_WEIGHTS = {
  absences: 25,
  retards: 10,
  reportAge: 20,
  reportsToRevise: 15,
  gradeTrend: 20,
  inactivity: 10
} as const

export interface RiskMetrics {
  /** Sessions pointées (présence saisie) sur les 30 derniers jours. */
  sessionsLast30: number
  /** Absences non excusées sur les 30 derniers jours. */
  unexcusedAbsencesLast30: number
  /** Retards sur les 30 derniers jours. */
  latesLast30: number
  /** Jours écoulés depuis le dernier rapport d'étape soumis. `null` = aucun rapport soumis. */
  daysSinceLastSubmittedReport: number | null
  /** Rapports renvoyés « à revoir » et jamais re-soumis. */
  reportsToReviseCount: number
  /** Moyenne des notes des 30 derniers jours (`null` si aucune note). */
  avgGradeLast30: number | null
  /** Moyenne des notes des 30 jours précédents, J-60 → J-30 (`null` si aucune note). */
  avgGradePrev30: number | null
  /** Jours depuis la dernière note ou le dernier retour de mission. `null` = aucune activité connue. */
  daysSinceLastActivity: number | null
}

export interface RiskAssessment {
  /** 0–100, arrondi à l'entier. */
  score: number
  level: RiskLevel
  /** Phrases françaises prêtes à afficher, de la plus pénalisante à la moins. */
  reasons: string[]
}

interface Signal {
  points: number
  reason: string
}

function clamp(value: number, max: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.min(Math.round(value), max)
}

function plural(count: number, singular: string, pluralForm: string): string {
  return count > 1 ? pluralForm : singular
}

/** Formatage français d'une note (une décimale, virgule décimale). */
function formatGrade(value: number): string {
  return (Math.round(value * 10) / 10).toString().replace('.', ',')
}

/**
 * Absences non excusées : 25 points au plafond, atteint à 50 % de sessions
 * manquées. Un taux de 20 % vaut 10 points.
 */
function absenceSignal(m: RiskMetrics): Signal | null {
  if (m.sessionsLast30 <= 0 || m.unexcusedAbsencesLast30 <= 0) return null
  const rate = m.unexcusedAbsencesLast30 / m.sessionsLast30
  const points = Math.max(1, clamp(rate * 50, RISK_WEIGHTS.absences))
  const pct = Math.round(rate * 100)
  return {
    points,
    reason: `${m.unexcusedAbsencesLast30} ${plural(m.unexcusedAbsencesLast30, 'absence non excusée', 'absences non excusées')} sur les 30 derniers jours (${pct} % des sessions).`
  }
}

/**
 * Retards : 10 points au plafond, atteint à 40 % de sessions en retard.
 */
function lateSignal(m: RiskMetrics): Signal | null {
  if (m.sessionsLast30 <= 0 || m.latesLast30 <= 0) return null
  const rate = m.latesLast30 / m.sessionsLast30
  const points = Math.max(1, clamp(rate * 25, RISK_WEIGHTS.retards))
  return {
    points,
    reason: `${m.latesLast30} ${plural(m.latesLast30, 'retard', 'retards')} sur les 30 derniers jours.`
  }
}

/**
 * Ancienneté du dernier rapport d'étape soumis : au-delà de 30 jours le suivi
 * décroche. Aucun rapport jamais soumis vaut 15 points (signal fort mais non
 * maximal : un nouvel arrivant n'est pas « en alerte » pour autant).
 */
function reportAgeSignal(m: RiskMetrics): Signal | null {
  const days = m.daysSinceLastSubmittedReport
  if (days === null) {
    return { points: 15, reason: "Aucun rapport d'étape soumis à ce jour." }
  }
  let points = 0
  if (days > 60) points = 20
  else if (days > 45) points = 15
  else if (days > 30) points = 10
  if (points === 0) return null
  return {
    points,
    reason: `Dernier rapport d'étape soumis il y a ${days} jours.`
  }
}

/** Rapports « à revoir » non re-soumis : 8 points chacun, plafond 15. */
function reportsToReviseSignal(m: RiskMetrics): Signal | null {
  if (m.reportsToReviseCount <= 0) return null
  return {
    points: clamp(m.reportsToReviseCount * 8, RISK_WEIGHTS.reportsToRevise),
    reason: `${m.reportsToReviseCount} ${plural(m.reportsToReviseCount, 'rapport à revoir non re-soumis', 'rapports à revoir non re-soumis')}.`
  }
}

/**
 * Tendance des notes : 5 points par point de moyenne perdu (sur 20) entre les
 * 30 derniers jours et les 30 jours précédents. Plafond 20 (-4 points ou plus).
 */
function gradeTrendSignal(m: RiskMetrics): Signal | null {
  if (m.avgGradeLast30 === null || m.avgGradePrev30 === null) return null
  const delta = m.avgGradeLast30 - m.avgGradePrev30
  if (delta >= 0) return null
  return {
    points: Math.max(1, clamp(-delta * 5, RISK_WEIGHTS.gradeTrend)),
    reason: `Notes en baisse : ${formatGrade(m.avgGradeLast30)}/20 sur 30 jours contre ${formatGrade(m.avgGradePrev30)}/20 sur la période précédente.`
  }
}

/** Inactivité : ni note ni retour de mission depuis plus de 14 jours. */
function inactivitySignal(m: RiskMetrics): Signal | null {
  const days = m.daysSinceLastActivity
  if (days === null) {
    return {
      points: RISK_WEIGHTS.inactivity,
      reason: 'Aucune activité enregistrée : ni note, ni retour de mission.'
    }
  }
  let points = 0
  if (days > 30) points = 10
  else if (days > 21) points = 6
  else if (days > 14) points = 3
  if (points === 0) return null
  return {
    points,
    reason: `Aucune note ni retour de mission depuis ${days} jours.`
  }
}

/**
 * Calcule le score de risque de décrochage d'un étudiant à partir de ses
 * métriques. Fonction pure et déterministe.
 */
export function computeRiskScore(metrics: RiskMetrics): RiskAssessment {
  const signals = [
    absenceSignal(metrics),
    lateSignal(metrics),
    reportAgeSignal(metrics),
    reportsToReviseSignal(metrics),
    gradeTrendSignal(metrics),
    inactivitySignal(metrics)
  ].filter((s): s is Signal => s !== null && s.points > 0)

  const score = Math.min(
    100,
    signals.reduce((total, s) => total + s.points, 0)
  )

  return {
    score,
    level: riskLevelFromScore(score),
    reasons: [...signals].sort((a, b) => b.points - a.points).map((s) => s.reason)
  }
}
