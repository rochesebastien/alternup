// Logique pure du pipeline d'ingestion (ADR-0003) : parseur streaming du dump
// JSON et mapping LBA → OffreNormalisee. Le script lui-même (Prisma, réseau)
// se vérifie par exécution réelle — politique de test du dépôt.

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseJsonArrayStream } from '../../scripts/ingest/json-array-stream.ts'
import { mapLbaJob } from '../../scripts/ingest/sources/la-bonne-alternance.ts'
import { estMorteSelonSource, type OffreNormalisee } from '../../scripts/ingest/types.ts'

async function* enChunks(texte: string, taille: number): AsyncIterable<Uint8Array> {
  const octets = new TextEncoder().encode(texte)
  for (let i = 0; i < octets.length; i += taille) {
    yield octets.subarray(i, i + taille)
  }
}

async function collecter(chunks: AsyncIterable<Uint8Array | string>): Promise<unknown[]> {
  const elements: unknown[] = []
  for await (const element of parseJsonArrayStream(chunks)) elements.push(element)
  return elements
}

describe('parseJsonArrayStream', () => {
  it('itère les éléments quel que soit le découpage des chunks', async () => {
    const json = '[{"a":1,"b":{"c":[1,2]}},{"a":2},{"a":3,"t":"x"}]'
    for (const taille of [1, 2, 3, 7, 1000]) {
      const elements = await collecter(enChunks(json, taille))
      expect(elements).toEqual([{ a: 1, b: { c: [1, 2] } }, { a: 2 }, { a: 3, t: 'x' }])
    }
  })

  it('ne se laisse pas piéger par des crochets et accolades dans les chaînes', async () => {
    const json = '[{"titre":"Dév [H/F] chez {Acme}","note":"fin ]"},{"x":"\\"quote\\" et \\\\"}]'
    const elements = await collecter(enChunks(json, 5))
    expect(elements).toEqual([
      { titre: 'Dév [H/F] chez {Acme}', note: 'fin ]' },
      { x: '"quote" et \\' }
    ])
  })

  it('recolle les caractères multi-octets UTF-8 coupés entre deux chunks', async () => {
    const json = '[{"lieu":"Besançon — Doubs 🏔️"}]'
    // taille 1 : chaque octet arrive seul, y compris au milieu d\'un émoji.
    const elements = await collecter(enChunks(json, 1))
    expect(elements).toEqual([{ lieu: 'Besançon — Doubs 🏔️' }])
  })

  it('gère tableau vide, scalaires et blancs', async () => {
    expect(await collecter(enChunks('  [ ] ', 2))).toEqual([])
    expect(await collecter(enChunks('[1, "deux" ,true,null]', 3))).toEqual([1, 'deux', true, null])
  })

  it('jette sur un flux tronqué (tableau jamais refermé)', async () => {
    await expect(collecter(enChunks('[{"a":1},{"a":2}', 4))).rejects.toThrow(/tronqué/)
  })

  it('jette sur un flux qui n\'est pas un tableau JSON', async () => {
    await expect(collecter(enChunks('{"url":"..."}', 4))).rejects.toThrow(/avant l'ouverture/)
    await expect(collecter(enChunks('[1] 2', 4))).rejects.toThrow(/après la fermeture/)
  })
})

const OFFRE_LBA_COMPLETE = {
  identifier: { id: null, partner_label: 'France Travail', partner_job_id: '195XKPV' },
  workplace: {
    name: 'Carrefour',
    legal_name: 'CARREFOUR HYPERMARCHES SAS',
    location: { address: '45 avenue Jean Jaurès, 69007 Lyon', geopoint: { type: 'Point', coordinates: [4.84, 45.73] } }
  },
  apply: { url: 'https://candidat.francetravail.example/offres/195XKPV', phone: null, recipient_id: null },
  contract: { type: ['Professionnalisation'], start: '2026-10-01', duration: 12, remote: 'onsite' },
  offer: {
    title: 'Assistant RH en alternance',
    rome_codes: ['M1501', 'M1502'],
    target_diploma: { level: '5', label: 'BTS' },
    publication: { creation: '2026-08-18T09:12:00.000Z', expiration: '2026-10-18T23:59:59.000Z' },
    status: 'Active'
  }
}

describe('mapLbaJob', () => {
  it('mappe tous les champs de l\'ADR-0002 (rapport D)', () => {
    const offre = mapLbaJob(OFFRE_LBA_COMPLETE)
    expect(offre).toEqual({
      url: 'https://candidat.francetravail.example/offres/195XKPV',
      titre: 'Assistant RH en alternance',
      entreprise: 'Carrefour',
      lieu: '45 avenue Jean Jaurès, 69007 Lyon',
      typeContrat: 'professionnalisation',
      niveauDiplome: '5',
      romeCodes: ['M1501', 'M1502'],
      datePublication: new Date('2026-08-18T09:12:00.000Z'),
      dateExpiration: new Date('2026-10-18T23:59:59.000Z'),
      raw: OFFRE_LBA_COMPLETE,
      partnerLabel: 'France Travail',
      partnerJobId: '195XKPV',
      statutSource: 'Active'
    })
  })

  it('filtre les contrats hors alternance (garde-fou) et retient le premier type mappable', () => {
    const cdi = structuredClone(OFFRE_LBA_COMPLETE)
    cdi.contract.type = ['CDI']
    expect(mapLbaJob(cdi)).toBeNull()

    const mixte = structuredClone(OFFRE_LBA_COMPLETE)
    mixte.contract.type = ['Apprentissage', 'Professionnalisation']
    expect(mapLbaJob(mixte)?.typeContrat).toBe('apprentissage')
  })

  it('écarte une entrée sans apply.url ou sans offer.title', () => {
    const sansUrl = structuredClone(OFFRE_LBA_COMPLETE) as Record<string, unknown>
    ;(sansUrl.apply as Record<string, unknown>).url = null
    expect(mapLbaJob(sansUrl)).toBeNull()

    const sansTitre = structuredClone(OFFRE_LBA_COMPLETE) as Record<string, unknown>
    ;(sansTitre.offer as Record<string, unknown>).title = '  '
    expect(mapLbaJob(sansTitre)).toBeNull()

    expect(mapLbaJob(null)).toBeNull()
    expect(mapLbaJob('pas un objet')).toBeNull()
  })

  it('tolère les champs optionnels absents ou invalides', () => {
    const minimal = {
      apply: { url: 'https://exemple.test/offre/1' },
      contract: { type: ['Apprentissage'] },
      offer: { title: 'Apprenti', publication: { creation: 'pas-une-date' } }
    }
    expect(mapLbaJob(minimal)).toEqual({
      url: 'https://exemple.test/offre/1',
      titre: 'Apprenti',
      entreprise: null,
      lieu: null,
      typeContrat: 'apprentissage',
      niveauDiplome: null,
      romeCodes: [],
      datePublication: null,
      dateExpiration: null,
      raw: minimal,
      partnerLabel: null,
      partnerJobId: null,
      statutSource: null
    })
  })

  it('replie entreprise sur workplace.legal_name quand workplace.name est absent', () => {
    const sansNom = structuredClone(OFFRE_LBA_COMPLETE)
    ;(sansNom.workplace as Record<string, unknown>).name = null
    expect(mapLbaJob(sansNom)?.entreprise).toBe('CARREFOUR HYPERMARCHES SAS')
  })

  it('parcourt la fixture d\'intégration : 11 entrées, 10 offres retenues', async () => {
    const chemin = fileURLToPath(new URL('../fixtures/lba-export-sample.json', import.meta.url))
    const contenu = await readFile(chemin, 'utf8')
    const entrees = await collecter((async function* () { yield contenu })())
    expect(entrees).toHaveLength(11)
    const offres = entrees.map(mapLbaJob).filter((o): o is OffreNormalisee => o !== null)
    expect(offres).toHaveLength(10)
    expect(offres.map((o) => o.partnerLabel)).toContain('France Travail')
  })
})

describe('estMorteSelonSource', () => {
  const now = new Date('2026-08-30T12:00:00.000Z')
  const base = mapLbaJob(OFFRE_LBA_COMPLETE) as OffreNormalisee

  it('déclare morte une offre Filled/Cancelled ou expirée, vivante sinon', () => {
    expect(estMorteSelonSource(base, now)).toBe(false)
    expect(estMorteSelonSource({ ...base, statutSource: 'Filled' }, now)).toBe(true)
    expect(estMorteSelonSource({ ...base, statutSource: 'Cancelled' }, now)).toBe(true)
    expect(estMorteSelonSource({ ...base, dateExpiration: new Date('2026-06-01T00:00:00Z') }, now)).toBe(true)
    expect(estMorteSelonSource({ ...base, dateExpiration: null, statutSource: null }, now)).toBe(false)
  })
})
