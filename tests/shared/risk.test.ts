import { describe, expect, it } from 'vitest'
import {
  RISK_ALERTE_THRESHOLD,
  RISK_VIGILANCE_THRESHOLD,
  computeRiskScore,
  riskLevelColor,
  riskLevelFromScore,
  riskLevelLabel,
  type RiskMetrics
} from '~/shared/utils/risk'

/** Étudiant sans aucun signal : base des scénarios. */
const healthy: RiskMetrics = {
  sessionsLast30: 20,
  unexcusedAbsencesLast30: 0,
  latesLast30: 0,
  daysSinceLastSubmittedReport: 5,
  reportsToReviseCount: 0,
  avgGradeLast30: 14,
  avgGradePrev30: 13,
  daysSinceLastActivity: 2
}

function metrics(overrides: Partial<RiskMetrics>): RiskMetrics {
  return { ...healthy, ...overrides }
}

describe('riskLevelFromScore', () => {
  it('classe les scores selon les seuils 40 / 70', () => {
    expect(riskLevelFromScore(0)).toBe('ok')
    expect(riskLevelFromScore(39)).toBe('ok')
    expect(riskLevelFromScore(RISK_VIGILANCE_THRESHOLD)).toBe('vigilance')
    expect(riskLevelFromScore(69)).toBe('vigilance')
    expect(riskLevelFromScore(RISK_ALERTE_THRESHOLD)).toBe('alerte')
    expect(riskLevelFromScore(100)).toBe('alerte')
  })
})

describe('riskLevelLabel / riskLevelColor', () => {
  it('expose un libellé français et une couleur par niveau', () => {
    expect(riskLevelLabel('ok')).toBe('Aucun signal')
    expect(riskLevelLabel('vigilance')).toBe('Vigilance')
    expect(riskLevelLabel('alerte')).toBe('Alerte')
    expect(riskLevelColor('ok')).toBe('success')
    expect(riskLevelColor('vigilance')).toBe('warning')
    expect(riskLevelColor('alerte')).toBe('error')
  })
})

describe('computeRiskScore — cas nominaux', () => {
  it('renvoie 0 et aucune raison pour un étudiant sans signal', () => {
    const result = computeRiskScore(healthy)
    expect(result.score).toBe(0)
    expect(result.level).toBe('ok')
    expect(result.reasons).toEqual([])
  })

  it("ne pénalise pas lourdement un étudiant tout juste rattaché (aucune donnée)", () => {
    const result = computeRiskScore(
      metrics({
        sessionsLast30: 0,
        daysSinceLastSubmittedReport: null,
        avgGradeLast30: null,
        avgGradePrev30: null,
        daysSinceLastActivity: null
      })
    )
    // 15 (aucun rapport) + 10 (aucune activité) = 25 → reste « ok »
    expect(result.score).toBe(25)
    expect(result.level).toBe('ok')
    expect(result.reasons).toHaveLength(2)
  })

  it('pondère les absences non excusées proportionnellement aux sessions', () => {
    const result = computeRiskScore(
      metrics({ sessionsLast30: 10, unexcusedAbsencesLast30: 5 })
    )
    expect(result.score).toBe(25)
    expect(result.reasons[0]).toBe(
      '5 absences non excusées sur les 30 derniers jours (50 % des sessions).'
    )
  })

  it('plafonne les absences à 25 points', () => {
    const result = computeRiskScore(
      metrics({ sessionsLast30: 10, unexcusedAbsencesLast30: 10 })
    )
    expect(result.score).toBe(25)
  })

  it('plafonne les retards à 10 points', () => {
    const result = computeRiskScore(metrics({ sessionsLast30: 10, latesLast30: 8 }))
    expect(result.score).toBe(10)
    expect(result.reasons[0]).toBe('8 retards sur les 30 derniers jours.')
  })

  it("échelonne l'ancienneté du dernier rapport soumis", () => {
    expect(computeRiskScore(metrics({ daysSinceLastSubmittedReport: 30 })).score).toBe(0)
    expect(computeRiskScore(metrics({ daysSinceLastSubmittedReport: 31 })).score).toBe(10)
    expect(computeRiskScore(metrics({ daysSinceLastSubmittedReport: 46 })).score).toBe(15)
    expect(computeRiskScore(metrics({ daysSinceLastSubmittedReport: 61 })).score).toBe(20)
  })

  it('compte les rapports à revoir non re-soumis, plafond 15', () => {
    expect(computeRiskScore(metrics({ reportsToReviseCount: 1 })).score).toBe(8)
    expect(computeRiskScore(metrics({ reportsToReviseCount: 2 })).score).toBe(15)
    expect(computeRiskScore(metrics({ reportsToReviseCount: 9 })).score).toBe(15)
  })

  it('pénalise une baisse de moyenne et pas une hausse', () => {
    expect(computeRiskScore(metrics({ avgGradeLast30: 11, avgGradePrev30: 12 })).score).toBe(5)
    expect(computeRiskScore(metrics({ avgGradeLast30: 8, avgGradePrev30: 15 })).score).toBe(20)
    expect(computeRiskScore(metrics({ avgGradeLast30: 18, avgGradePrev30: 12 })).score).toBe(0)
  })

  it('formate la baisse de notes en français', () => {
    const result = computeRiskScore(metrics({ avgGradeLast30: 9.5, avgGradePrev30: 13.25 }))
    expect(result.reasons[0]).toBe(
      'Notes en baisse : 9,5/20 sur 30 jours contre 13,3/20 sur la période précédente.'
    )
  })

  it("échelonne l'inactivité", () => {
    expect(computeRiskScore(metrics({ daysSinceLastActivity: 14 })).score).toBe(0)
    expect(computeRiskScore(metrics({ daysSinceLastActivity: 15 })).score).toBe(3)
    expect(computeRiskScore(metrics({ daysSinceLastActivity: 22 })).score).toBe(6)
    expect(computeRiskScore(metrics({ daysSinceLastActivity: 31 })).score).toBe(10)
  })
})

describe('computeRiskScore — limites de seuils', () => {
  it('bascule en vigilance exactement à 40', () => {
    const result = computeRiskScore(
      metrics({
        sessionsLast30: 10,
        unexcusedAbsencesLast30: 5, // 25
        daysSinceLastSubmittedReport: 31, // 10
        avgGradeLast30: 11,
        avgGradePrev30: 12 // 5
      })
    )
    expect(result.score).toBe(RISK_VIGILANCE_THRESHOLD)
    expect(result.level).toBe('vigilance')
  })

  it('reste « ok » juste sous le seuil de vigilance', () => {
    const result = computeRiskScore(
      metrics({
        sessionsLast30: 10,
        unexcusedAbsencesLast30: 5, // 25
        daysSinceLastSubmittedReport: 31, // 10
        daysSinceLastActivity: 15 // 3
      })
    )
    expect(result.score).toBe(38)
    expect(result.level).toBe('ok')
  })

  it('bascule en alerte exactement à 70', () => {
    const result = computeRiskScore(
      metrics({
        sessionsLast30: 10,
        unexcusedAbsencesLast30: 5, // 25
        latesLast30: 4, // 10
        daysSinceLastSubmittedReport: 61, // 20
        avgGradeLast30: 11,
        avgGradePrev30: 12, // 5
        daysSinceLastActivity: 31 // 10
      })
    )
    expect(result.score).toBe(RISK_ALERTE_THRESHOLD)
    expect(result.level).toBe('alerte')
  })

  it('reste en vigilance juste sous le seuil d\'alerte', () => {
    const result = computeRiskScore(
      metrics({
        sessionsLast30: 10,
        unexcusedAbsencesLast30: 5, // 25
        latesLast30: 4, // 10
        daysSinceLastSubmittedReport: 61, // 20
        avgGradeLast30: 11,
        avgGradePrev30: 12, // 5
        daysSinceLastActivity: 22 // 6
      })
    )
    expect(result.score).toBe(66)
    expect(result.level).toBe('vigilance')
  })

  it('plafonne le score à 100 et trie les raisons par gravité', () => {
    const result = computeRiskScore({
      sessionsLast30: 10,
      unexcusedAbsencesLast30: 10, // 25
      latesLast30: 10, // 10
      daysSinceLastSubmittedReport: 200, // 20
      reportsToReviseCount: 4, // 15
      avgGradeLast30: 5,
      avgGradePrev30: 15, // 20
      daysSinceLastActivity: null // 10
    })
    expect(result.score).toBe(100)
    expect(result.level).toBe('alerte')
    expect(result.reasons).toHaveLength(6)
    expect(result.reasons[0]).toContain('absences non excusées')
    expect(result.reasons[1]).toContain("Dernier rapport d'étape")
    expect(result.reasons[2]).toContain('Notes en baisse')
  })
})
