// Page détail d'une offre (`/alternant/offres/[id]`, `/tuteur/offres/[id]`) :
// extraction de TOUTES les informations du payload source (`Offre.raw`, dump
// La Bonne Alternance) vers une vue typée et stable. Le client ne reçoit
// jamais `raw` tel quel : le format du dump peut évoluer, la vue non.
//
// Module PUR (testé dans tests/shared/offre-detail.test.ts). Accès défensifs :
// le payload est une donnée externe, un champ hors format devient `null`.

import { dureeMoisDe } from './offres.ts'
import { plainText, richTextHtml } from './rich-text.ts'

export interface OffreDetailRaw {
  offre: {
    /** HTML assaini (`richTextHtml`), à afficher avec `v-html`. */
    descriptionHtml: string | null
    niveau: { code: string | null; libelle: string | null }
    competencesAttendues: string[]
    competencesAcquises: string[]
    conditionsAcces: string[]
    nombrePostes: number | null
    statutSource: string | null
  }
  contrat: {
    types: string[]
    debut: string | null
    dureeMois: number | null
    teletravail: string | null
  }
  entreprise: {
    nom: string | null
    raisonSociale: string | null
    marque: string | null
    siret: string | null
    siteWeb: string | null
    taille: string | null
    /** HTML assaini (`richTextHtml`), à afficher avec `v-html`. */
    descriptionHtml: string | null
    naf: { code: string | null; libelle: string | null }
    opco: string | null
    idcc: string | null
  }
  localisation: {
    adresse: string | null
    latitude: number | null
    longitude: number | null
  }
  candidature: {
    url: string | null
    telephone: string | null
  }
  source: {
    identifiant: string | null
    partenaire: string | null
    idPartenaire: string | null
    delegue: boolean | null
  }
}

function objet(valeur: unknown): Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
    ? (valeur as Record<string, unknown>)
    : {}
}

/** Champ texte simple : balises retirées et entités décodées (`&eacute;` → é). */
function texte(valeur: unknown): string | null {
  if (typeof valeur === 'number' && Number.isFinite(valeur)) return String(valeur)
  if (typeof valeur !== 'string') return null
  const propre = plainText(valeur)
  return propre !== '' ? propre : null
}

function textes(valeur: unknown): string[] {
  return Array.isArray(valeur)
    ? valeur.map(texte).filter((v): v is string => v !== null)
    : []
}

function nombre(valeur: unknown): number | null {
  return typeof valeur === 'number' && Number.isFinite(valeur) ? valeur : null
}

/** Lien http(s) uniquement : un `javascript:` venu de la source ne doit jamais devenir un href. */
function lien(valeur: unknown): string | null {
  const url = texte(valeur)
  return url && /^https?:\/\//i.test(url) ? url : null
}

export function offreDetailFromRaw(raw: unknown): OffreDetailRaw {
  const job = objet(raw)
  const identifier = objet(job.identifier)
  const workplace = objet(job.workplace)
  const location = objet(workplace.location)
  const geopoint = objet(location.geopoint)
  const domain = objet(workplace.domain)
  const naf = objet(domain.naf)
  const apply = objet(job.apply)
  const contract = objet(job.contract)
  const offer = objet(job.offer)
  const diploma = objet(offer.target_diploma)

  // GeoJSON : [longitude, latitude].
  const coords = Array.isArray(geopoint.coordinates) ? geopoint.coordinates : []

  return {
    offre: {
      descriptionHtml: richTextHtml(offer.description),
      niveau: { code: texte(diploma.level), libelle: texte(diploma.label) },
      competencesAttendues: textes(offer.desired_skills),
      competencesAcquises: textes(offer.to_be_acquired_skills),
      conditionsAcces: textes(offer.access_conditions),
      nombrePostes: nombre(offer.opening_count),
      statutSource: texte(offer.status)
    },
    contrat: {
      types: textes(contract.type),
      debut: texte(contract.start),
      dureeMois: dureeMoisDe(contract.duration),
      teletravail: texte(contract.remote)
    },
    entreprise: {
      nom: texte(workplace.name),
      raisonSociale: texte(workplace.legal_name),
      marque: texte(workplace.brand),
      siret: texte(workplace.siret),
      siteWeb: lien(workplace.website),
      taille: texte(workplace.size),
      descriptionHtml: richTextHtml(workplace.description),
      naf: { code: texte(naf.code), libelle: texte(naf.label) },
      opco: texte(domain.opco),
      idcc: texte(domain.idcc)
    },
    localisation: {
      adresse: texte(location.address),
      latitude: nombre(coords[1]),
      longitude: nombre(coords[0])
    },
    candidature: {
      url: lien(apply.url),
      telephone: texte(apply.phone)
    },
    source: {
      identifiant: texte(identifier.id),
      partenaire: texte(identifier.partner_label),
      idPartenaire: texte(identifier.partner_job_id),
      delegue: typeof job.is_delegated === 'boolean' ? job.is_delegated : null
    }
  }
}

/** Mode de travail LBA (`contract.remote`) → libellé. */
export const TELETRAVAIL_LABELS: Record<string, string> = {
  onsite: 'Sur site',
  hybrid: 'Hybride',
  remote: 'Télétravail complet',
  fully_remote: 'Télétravail complet'
}

/** Taille d'entreprise LBA (`workplace.size`, tranche d'effectif) → libellé. */
export function tailleEntrepriseLabel(taille: string | null): string | null {
  if (!taille) return null
  if (/^\d+\+$/.test(taille)) return `${taille.slice(0, -1)} salariés et plus`
  const tranche = taille.match(/^(\d+)-(\d+)$/)
  if (tranche) return `${tranche[1]} à ${tranche[2]} salariés`
  return taille
}

/** Libellé de l'attribution source (`identifier.partner_label`). */
export function partenaireLabel(partenaire: string | null): string | null {
  if (!partenaire) return null
  if (partenaire === 'offres_emploi_lba') return 'La bonne alternance'
  return partenaire
}

/** Détail tel que renvoyé par `GET /api/offres/:id`. */
export interface OffreDetailResponse {
  id: string
  url: string
  titre: string
  entreprise: string | null
  lieu: string | null
  typeContrat: 'apprentissage' | 'professionnalisation' | null
  niveauDiplome: string | null
  dureeMois: number | null
  romeCodes: string[]
  datePublication: string | null
  dateExpiration: string | null
  statut: 'active' | 'expiree'
  firstSeen: string
  lastSeen: string
  monStatut: 'vue' | 'candidate' | 'rejetee' | null
  detail: OffreDetailRaw
}

/** Ligne « libellé → valeur » d'un bloc de la page détail (`null` = non précisé). */
export interface OffreDetailRow {
  label: string
  value: string | null
  /** Lien : http(s) (nouvel onglet) ou `tel:`. */
  href?: string | null
  /** Identifiant (SIRET, code) affiché en chasse fixe. */
  mono?: boolean
}
