import { describe, expect, it } from 'vitest'
import { computeAttendanceSummary } from '~/shared/utils/livret'

describe('computeAttendanceSummary', () => {
  it('renvoie un bilan vide sans aucun pointage', () => {
    expect(computeAttendanceSummary([])).toEqual({
      total: 0,
      present: 0,
      absent: 0,
      retard: 0,
      excuse: 0,
      rate: null
    })
  })

  it('ventile les statuts et calcule le taux de présence', () => {
    const summary = computeAttendanceSummary([
      'present',
      'present',
      'retard',
      'absent',
      'excuse'
    ])

    expect(summary).toEqual({
      total: 5,
      present: 2,
      absent: 1,
      retard: 1,
      excuse: 1,
      // Un retard compte comme une présence effective : (2 + 1) / 5 = 60 %.
      rate: 60
    })
  })

  it('compte un retard comme une présence (même convention que les bulletins)', () => {
    expect(computeAttendanceSummary(['retard', 'retard']).rate).toBe(100)
  })

  it('tombe à 0 % quand tout est absent ou excusé', () => {
    expect(computeAttendanceSummary(['absent', 'excuse']).rate).toBe(0)
  })

  it('arrondit le taux à l’entier le plus proche', () => {
    // 2 présences sur 3 = 66,67 % -> 67 %.
    expect(computeAttendanceSummary(['present', 'present', 'absent']).rate).toBe(67)
  })

  it('compte un statut inconnu dans le total sans le classer', () => {
    const summary = computeAttendanceSummary(['present', 'inconnu'])

    expect(summary.total).toBe(2)
    expect(summary.present).toBe(1)
    expect(summary.absent).toBe(0)
    expect(summary.excuse).toBe(0)
    expect(summary.retard).toBe(0)
    expect(summary.rate).toBe(50)
  })

  it('ne partage pas l’objet vide entre deux appels', () => {
    const first = computeAttendanceSummary([])
    first.total = 42

    expect(computeAttendanceSummary([]).total).toBe(0)
  })
})
