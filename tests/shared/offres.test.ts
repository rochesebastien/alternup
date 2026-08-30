import { describe, expect, it } from 'vitest'
import { dedupHashOf } from '~/server/utils/offres-dedup'
import {
  CANDIDATURE_STATUT_META,
  OFFRE_CONTRAT_META,
  OFFRE_EXPIRATION_JOURS,
  OFFRE_NOUVEAUTE_JOURS,
  OFFRE_PAGE_SIZE,
  estNouvelle,
  normalizeForDedup,
  offreListFiltersFrom,
  offreListQueryFrom,
  offreListQuerySchema,
  offreStatutInputSchema,
  type OffreListFilters
} from '~/shared/utils/offres'

const NOW = new Date('2026-08-30T12:00:00Z')
const DAY_MS = 86_400_000

describe('normalizeForDedup', () => {
  it('passe en minuscules et supprime les accents', () => {
    expect(normalizeForDedup('Développeur Étude', 'Société Générale', 'Nîmes')).toBe(
      'developpeur etude|societe generale|nimes'
    )
  })

  it('réduit les espaces multiples et trim', () => {
    expect(normalizeForDedup('  Dev   Web ', ' ACME\t Corp ', '\nParis ')).toBe(
      'dev web|acme corp|paris'
    )
  })

  it('traite entreprise et lieu absents comme des champs vides', () => {
    expect(normalizeForDedup('Dev Web', null, undefined)).toBe('dev web||')
  })

  it('sépare les champs : déplacer un mot change la clé', () => {
    expect(normalizeForDedup('Dev Web ACME', '', 'Paris')).not.toBe(
      normalizeForDedup('Dev Web', 'ACME', 'Paris')
    )
  })
})

describe('dedupHashOf', () => {
  it('renvoie un sha256 hexadécimal stable', () => {
    // sha256 de 'developpeur web|acme corp|paris', figé pour détecter tout
    // changement de normalisation (les hash déjà en base deviendraient orphelins).
    expect(dedupHashOf('Développeur Web', 'ACME Corp', 'Paris')).toBe(
      '8009470d656dbffd31a0f02764a78c6b45fd2e85d36aa61e9cf4b4829cd72fa6'
    )
  })

  it('est insensible à la casse, aux accents et aux espaces', () => {
    const reference = dedupHashOf('Développeur Web', 'ACME Corp', 'Paris')
    expect(dedupHashOf('développeur   web', 'acme corp', ' PARIS ')).toBe(reference)
    expect(dedupHashOf('DÉVELOPPEUR WEB', 'Acme Corp', 'Pàris')).toBe(reference)
  })

  it('change dès qu\'un champ diffère', () => {
    const reference = dedupHashOf('Dev Web', 'ACME', 'Paris')
    expect(dedupHashOf('Dev Mobile', 'ACME', 'Paris')).not.toBe(reference)
    expect(dedupHashOf('Dev Web', 'ACME', 'Lyon')).not.toBe(reference)
    expect(dedupHashOf('Dev Web', null, 'Paris')).not.toBe(reference)
  })
})

describe('constantes', () => {
  it('expose les valeurs actées par les ADR 0002 et 0004', () => {
    expect(OFFRE_EXPIRATION_JOURS).toBe(3)
    expect(OFFRE_NOUVEAUTE_JOURS).toBe(7)
    expect(OFFRE_PAGE_SIZE).toBe(25)
  })
})

describe('estNouvelle', () => {
  const seenDaysAgo = (days: number) => new Date(NOW.getTime() - days * DAY_MS)

  it('marque nouvelle une offre vue il y a moins de 7 jours sans statut', () => {
    expect(estNouvelle({ firstSeen: seenDaysAgo(0) }, null, NOW)).toBe(true)
    expect(estNouvelle({ firstSeen: seenDaysAgo(6) }, undefined, NOW)).toBe(true)
  })

  it('accepte un firstSeen en chaîne ISO', () => {
    expect(estNouvelle({ firstSeen: seenDaysAgo(1).toISOString() }, null, NOW)).toBe(true)
  })

  it('cesse d\'être nouvelle à 7 jours pile', () => {
    expect(estNouvelle({ firstSeen: seenDaysAgo(7) }, null, NOW)).toBe(false)
    // une milliseconde avant la borne, elle l'est encore
    expect(
      estNouvelle({ firstSeen: new Date(NOW.getTime() - 7 * DAY_MS + 1) }, null, NOW)
    ).toBe(true)
  })

  it('n\'est jamais nouvelle dès qu\'un statut utilisateur existe', () => {
    expect(estNouvelle({ firstSeen: seenDaysAgo(0) }, 'vue', NOW)).toBe(false)
    expect(estNouvelle({ firstSeen: seenDaysAgo(1) }, 'candidate', NOW)).toBe(false)
    expect(estNouvelle({ firstSeen: seenDaysAgo(2) }, 'rejetee', NOW)).toBe(false)
  })

  it('renvoie false pour une date invalide', () => {
    expect(estNouvelle({ firstSeen: 'pas une date' }, null, NOW)).toBe(false)
  })
})

describe('métadonnées d\'affichage', () => {
  it('fournit libellé français et icône lucide pour chaque type de contrat', () => {
    expect(OFFRE_CONTRAT_META.apprentissage).toEqual({
      label: 'Apprentissage',
      icon: 'i-lucide-graduation-cap'
    })
    expect(OFFRE_CONTRAT_META.professionnalisation.label).toBe('Professionnalisation')
  })

  it('fournit libellé français et icône lucide pour chaque statut de candidature', () => {
    for (const meta of Object.values(CANDIDATURE_STATUT_META)) {
      expect(meta.label.length).toBeGreaterThan(0)
      expect(meta.icon).toMatch(/^i-lucide-/)
    }
  })
})

describe('offreListQuerySchema', () => {
  it('applique les défauts sur une query vide', () => {
    const result = offreListQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ page: 1, limit: OFFRE_PAGE_SIZE, inclureExpirees: false })
  })

  it('coerce page et limit depuis des chaînes de query', () => {
    const result = offreListQuerySchema.safeParse({ page: '3', limit: '50' })
    expect(result.success && result.data.page).toBe(3)
    expect(result.success && result.data.limit).toBe(50)
  })

  it.each([
    ['page', '0'],
    ['page', '-1'],
    ['page', '1.5'],
    ['limit', '0'],
    ['limit', '101'],
    ['limit', 'tout']
  ])('refuse %s=%s', (key, value) => {
    expect(offreListQuerySchema.safeParse({ [key]: value }).success).toBe(false)
  })

  it('accepte les filtres valides', () => {
    const result = offreListQuerySchema.safeParse({
      typeContrat: 'apprentissage',
      statut: 'candidate',
      lieu: ' Lyon ',
      q: 'développeur'
    })
    expect(result.success).toBe(true)
    expect(result.data?.typeContrat).toBe('apprentissage')
    expect(result.data?.lieu).toBe('Lyon')
  })

  it('refuse un type de contrat inconnu avec un message français', () => {
    const result = offreListQuerySchema.safeParse({ typeContrat: 'stage' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Type de contrat invalide.')
  })

  it('refuse un statut de candidature inconnu avec un message français', () => {
    const result = offreListQuerySchema.safeParse({ statut: 'archivee' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Statut de candidature invalide.')
  })

  it.each(['lieu', 'q'])('borne %s à 120 caractères', (key) => {
    expect(offreListQuerySchema.safeParse({ [key]: 'a'.repeat(120) }).success).toBe(true)
    expect(offreListQuerySchema.safeParse({ [key]: 'a'.repeat(121) }).success).toBe(false)
  })

  it('lit inclureExpirees en chaîne de query sans piège "false" → true', () => {
    const on = offreListQuerySchema.safeParse({ inclureExpirees: 'true' })
    expect(on.success && on.data.inclureExpirees).toBe(true)
    const off = offreListQuerySchema.safeParse({ inclureExpirees: 'false' })
    expect(off.success && off.data.inclureExpirees).toBe(false)
    const bool = offreListQuerySchema.safeParse({ inclureExpirees: true })
    expect(bool.success && bool.data.inclureExpirees).toBe(true)
  })
})

const FILTRES_DEFAUT: OffreListFilters = {
  page: 1,
  q: '',
  lieu: '',
  typeContrat: '',
  statut: '',
  inclureExpirees: false
}

describe('offreListQueryFrom', () => {
  it('renvoie une query vide pour les filtres par défaut', () => {
    expect(offreListQueryFrom(FILTRES_DEFAUT)).toEqual({})
  })

  it('omet page=1 mais sérialise les pages suivantes', () => {
    expect(offreListQueryFrom({ ...FILTRES_DEFAUT, page: 3 })).toEqual({ page: '3' })
  })

  it('trim les champs texte et omet ceux devenus vides', () => {
    expect(offreListQueryFrom({ ...FILTRES_DEFAUT, q: '  dev  ', lieu: '   ' })).toEqual({
      q: 'dev'
    })
  })

  it('sérialise tous les filtres actifs', () => {
    expect(
      offreListQueryFrom({
        page: 2,
        q: 'dev',
        lieu: 'Lyon',
        typeContrat: 'apprentissage',
        statut: 'candidate',
        inclureExpirees: true
      })
    ).toEqual({
      page: '2',
      q: 'dev',
      lieu: 'Lyon',
      typeContrat: 'apprentissage',
      statut: 'candidate',
      inclureExpirees: 'true'
    })
  })

  it('omet inclureExpirees=false (le défaut serveur)', () => {
    expect(offreListQueryFrom({ ...FILTRES_DEFAUT, inclureExpirees: false })).toEqual({})
  })
})

describe('offreListFiltersFrom', () => {
  it('renvoie les défauts pour une query vide', () => {
    expect(offreListFiltersFrom({})).toEqual(FILTRES_DEFAUT)
  })

  it('est l\'inverse d\'offreListQueryFrom pour des filtres actifs', () => {
    const filtres: OffreListFilters = {
      page: 4,
      q: 'dev',
      lieu: 'Lyon',
      typeContrat: 'professionnalisation',
      statut: 'rejetee',
      inclureExpirees: true
    }
    expect(offreListFiltersFrom(offreListQueryFrom(filtres))).toEqual(filtres)
  })

  it('retombe sur les défauts pour des valeurs invalides sans lever d\'erreur', () => {
    expect(
      offreListFiltersFrom({
        page: 'abc',
        typeContrat: 'stage',
        statut: 'archivee',
        inclureExpirees: 'oui'
      })
    ).toEqual(FILTRES_DEFAUT)
  })

  it('ignore les tableaux d\'une query répétée (?q=a&q=b)', () => {
    expect(offreListFiltersFrom({ q: ['a', 'b'], page: ['2', '3'] })).toEqual(FILTRES_DEFAUT)
  })

  it('ramène page=0 ou page négative à 1', () => {
    expect(offreListFiltersFrom({ page: '0' }).page).toBe(1)
    expect(offreListFiltersFrom({ page: '-2' }).page).toBe(1)
  })
})

describe('offreStatutInputSchema', () => {
  it.each(['vue', 'candidate', 'rejetee'])('accepte le statut %s', (statut) => {
    const result = offreStatutInputSchema.safeParse({ statut })
    expect(result.success && result.data.statut).toBe(statut)
  })

  it('refuse un statut inconnu avec un message français', () => {
    const result = offreStatutInputSchema.safeParse({ statut: 'en_attente' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Statut de candidature invalide.')
  })

  it('refuse un corps vide', () => {
    expect(offreStatutInputSchema.safeParse({}).success).toBe(false)
  })
})
