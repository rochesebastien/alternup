import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  offreDetailFromRaw,
  partenaireLabel,
  tailleEntrepriseLabel
} from '~/shared/utils/offre-detail'
import { dureeMoisDe, formatDureeMois, niveauDiplomeLabel } from '~/shared/utils/offres'

const fixture = JSON.parse(
  readFileSync(fileURLToPath(new URL('../fixtures/lba-export-sample.json', import.meta.url)), 'utf8')
) as unknown[]

describe('offreDetailFromRaw', () => {
  it('extrait toutes les informations d\'une offre LBA complète', () => {
    expect(offreDetailFromRaw(fixture[0])).toEqual({
      offre: {
        descriptionHtml: "<p>Participez au développement d'applications Nuxt/TypeScript.</p>",
        niveau: { code: '6', libelle: 'Licence, Bac+3' },
        competencesAttendues: ['TypeScript', 'Vue.js'],
        competencesAcquises: ['Nuxt', 'PostgreSQL'],
        conditionsAcces: [],
        nombrePostes: 1,
        statutSource: 'Active'
      },
      contrat: { types: ['Apprentissage'], debut: '2026-09-15', dureeMois: 24, teletravail: 'hybrid' },
      entreprise: {
        nom: 'Alternup Studio',
        raisonSociale: 'ALTERNUP STUDIO SAS',
        marque: null,
        siret: '90123456700018',
        siteWeb: 'https://alternup-studio.example',
        taille: '10-19',
        descriptionHtml: '<p>Studio de développement web parisien.</p>',
        naf: { code: '62.01Z', libelle: 'Programmation informatique' },
        opco: 'ATLAS',
        idcc: '1486'
      },
      localisation: { adresse: '12 rue de la Roquette, 75011 Paris', latitude: 48.8553, longitude: 2.3721 },
      candidature: {
        url: 'https://labonnealternance.apprentissage.beta.gouv.fr/emploi/offres_emploi_lba/68a1f09b2c41d75e01b40901/developpeur-web-full-stack',
        telephone: null
      },
      source: {
        identifiant: '68a1f09b2c41d75e01b40901',
        partenaire: 'offres_emploi_lba',
        idPartenaire: '68a1f09b2c41d75e01b40901',
        delegue: false
      }
    })
  })

  it('ne plante jamais sur un payload vide ou hors format', () => {
    for (const raw of [null, 'texte', 42, [], {}, { workplace: 'x', offer: [], contract: null }]) {
      const detail = offreDetailFromRaw(raw)
      expect(detail.entreprise.nom).toBeNull()
      expect(detail.offre.competencesAttendues).toEqual([])
      expect(detail.localisation.latitude).toBeNull()
      expect(detail.source.delegue).toBeNull()
    }
  })

  it('refuse les liens qui ne sont pas en http(s)', () => {
    const detail = offreDetailFromRaw({
      workplace: { website: 'javascript:alert(1)' },
      apply: { url: 'ftp://exemple.test' }
    })
    expect(detail.entreprise.siteWeb).toBeNull()
    expect(detail.candidature.url).toBeNull()
  })

  it('assainit le HTML des descriptions et décode les entités des champs simples', () => {
    const detail = offreDetailFromRaw({
      offer: { description: '<p onclick="x()"><strong>Qui sommes-nous ?</strong></p><script>alert(1)</script>' },
      workplace: { name: 'Caf&eacute; &amp; Co', description: '<ul><li>Un</li></ul>' }
    })
    expect(detail.offre.descriptionHtml).toBe('<p><strong>Qui sommes-nous ?</strong></p>')
    expect(detail.entreprise.descriptionHtml).toBe('<ul><li>Un</li></ul>')
    expect(detail.entreprise.nom).toBe('Café & Co')
  })

  it('traite toute la fixture sans erreur', () => {
    expect(fixture.map((raw) => offreDetailFromRaw(raw).offre.statutSource)).toHaveLength(fixture.length)
  })
})

describe('libellés', () => {
  it('niveau de diplôme', () => {
    expect(niveauDiplomeLabel('3')).toBe('CAP, BEP')
    expect(niveauDiplomeLabel('6')).toBe('Bac +3')
    expect(niveauDiplomeLabel('7')).toBe('Bac +5')
    expect(niveauDiplomeLabel('9')).toBe('Niveau 9')
    expect(niveauDiplomeLabel(null)).toBeNull()
  })

  it('durée de contrat', () => {
    expect(formatDureeMois(6)).toBe('6 mois')
    expect(formatDureeMois(12)).toBe('1 an')
    expect(formatDureeMois(18)).toBe('18 mois')
    expect(formatDureeMois(24)).toBe('2 ans')
    expect(formatDureeMois(0)).toBeNull()
    expect(formatDureeMois(null)).toBeNull()
    expect(dureeMoisDe(24)).toBe(24)
    expect(dureeMoisDe('24')).toBeNull()
  })

  it('taille d\'entreprise et diffuseur', () => {
    expect(tailleEntrepriseLabel('10-19')).toBe('10 à 19 salariés')
    expect(tailleEntrepriseLabel('5000+')).toBe('5000 salariés et plus')
    expect(tailleEntrepriseLabel('inconnue')).toBe('inconnue')
    expect(partenaireLabel('offres_emploi_lba')).toBe('La bonne alternance')
    expect(partenaireLabel('Hellowork')).toBe('Hellowork')
  })
})
