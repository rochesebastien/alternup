// Parseur streaming d'un tableau JSON de premier niveau (`[ {...}, {...} ]`).
//
// Le dump `/job/v1/export` de La Bonne Alternance couvre toute la France
// (plusieurs centaines de milliers d'offres) : le charger d'un bloc en mémoire
// (`await res.json()`) est exclu (ADR-0003). Ce module maison — zéro dépendance
// npm — découpe le flux en éléments de premier niveau (suivi de la profondeur
// `{}`/`[]` hors chaînes, avec gestion des échappements) et ne parse via
// `JSON.parse` qu'un élément à la fois : la mémoire est bornée par la taille du
// plus gros élément, pas par celle du dump. Testé dans
// `tests/shared/ingest-lba.test.ts` (découpes de chunks arbitraires, chaînes
// contenant des crochets, multi-octets UTF-8, flux tronqués/malformés).
//
// Module PUR (aucun import) — exécutable en type stripping Node ≥ 22.

const BLANCS = new Set([' ', '\t', '\n', '\r'])

type Phase = 'avant' | 'entre' | 'element' | 'fini'

/**
 * Itère les éléments de premier niveau d'un tableau JSON reçu en flux
 * (chunks binaires ou texte). Jette sur un flux qui n'est pas un tableau
 * JSON bien formé (y compris tableau jamais refermé : flux tronqué).
 */
export async function* parseJsonArrayStream(
  chunks: AsyncIterable<Uint8Array | string>
): AsyncGenerator<unknown, void, undefined> {
  const decoder = new TextDecoder('utf-8')

  let phase: Phase = 'avant'
  let tampon = ''
  let profondeur = 0
  let dansChaine = false
  let echappe = false
  /** Élément scalaire (nombre, booléen, null) : terminé par `,`, `]` ou un blanc. */
  let scalaire = false

  // Générateur synchrone interne : mutations d'état partagées, produit les
  // éléments complets (chaînes JSON) extraits du texte fourni.
  function* avaler(texte: string): Generator<string> {
    for (const c of texte) {
      switch (phase) {
        case 'avant': {
          if (BLANCS.has(c)) break
          if (c === '[') {
            phase = 'entre'
            break
          }
          throw new Error(`Flux JSON invalide : « ${c} » reçu avant l'ouverture du tableau`)
        }
        case 'entre': {
          if (BLANCS.has(c) || c === ',') break
          if (c === ']') {
            phase = 'fini'
            break
          }
          phase = 'element'
          tampon = c
          dansChaine = c === '"'
          echappe = false
          profondeur = c === '{' || c === '[' ? 1 : 0
          scalaire = !dansChaine && profondeur === 0
          break
        }
        case 'element': {
          if (dansChaine) {
            tampon += c
            if (echappe) echappe = false
            else if (c === '\\') echappe = true
            else if (c === '"') {
              dansChaine = false
              if (profondeur === 0) {
                yield tampon
                tampon = ''
                phase = 'entre'
              }
            }
            break
          }
          if (scalaire && (c === ',' || c === ']' || BLANCS.has(c))) {
            yield tampon
            tampon = ''
            phase = c === ']' ? 'fini' : 'entre'
            break
          }
          tampon += c
          if (c === '"') dansChaine = true
          else if (c === '{' || c === '[') profondeur++
          else if (c === '}' || c === ']') {
            profondeur--
            if (profondeur === 0) {
              yield tampon
              tampon = ''
              phase = 'entre'
            }
          }
          break
        }
        case 'fini': {
          if (!BLANCS.has(c)) {
            throw new Error(`Flux JSON invalide : « ${c} » reçu après la fermeture du tableau`)
          }
          break
        }
      }
    }
  }

  for await (const chunk of chunks) {
    const texte = typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true })
    for (const element of avaler(texte)) yield JSON.parse(element)
  }
  // Vide le décodeur (séquence multi-octets éventuellement à cheval sur la fin).
  for (const element of avaler(decoder.decode())) yield JSON.parse(element)

  // Cast : TS ne voit pas que `avaler` (closure) fait évoluer `phase`.
  if ((phase as Phase) !== 'fini') {
    throw new Error('Flux JSON tronqué : le tableau de premier niveau n\'est jamais refermé')
  }
}
