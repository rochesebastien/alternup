// Texte riche venu d'une source externe (descriptions des offres La Bonne
// Alternance, qui contiennent du HTML : <p>, <strong>, <ul>…).
//
// Module PUR, sans DOM (exécuté côté serveur) : le HTML est assaini par liste
// blanche AVANT d'atteindre le client, qui l'affiche avec `v-html`.
//   - seules des balises de mise en forme sans AUCUN attribut sont conservées
//     (pas de href, style, on*…) : aucune injection de script ou de lien possible ;
//   - script, style, iframe… sont supprimés avec leur contenu ;
//   - tout autre `<` est échappé ;
//   - les balises sont rééquilibrées comme le ferait un navigateur, pour que le
//     HTML rendu au serveur soit identique à celui que le navigateur reconstruit
//     (pas d'écart d'hydratation).
// Testé dans tests/shared/rich-text.test.ts.

/** Balises conservées (sans attribut), après normalisation des alias. */
const ALLOWED = new Set(['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h3', 'h4', 'blockquote'])

/** Alias ramenés à une balise autorisée (titres rabaissés sous le h1/h2 de la page). */
const ALIASES: Record<string, string> = {
  b: 'strong',
  i: 'em',
  h1: 'h3',
  h2: 'h3',
  h5: 'h4',
  h6: 'h4',
  div: 'p',
  section: 'p',
  article: 'p'
}

/** Balises supprimées AVEC leur contenu. */
const DROPPED_WITH_CONTENT = [
  'script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template',
  'svg', 'math', 'head', 'title', 'textarea', 'select', 'button', 'form'
]

/** Blocs qui ferment un paragraphe ouvert (comportement du parseur HTML). */
const BLOCKS = new Set(['p', 'ul', 'ol', 'h3', 'h4', 'blockquote'])

const VOID = new Set(['br'])

const TAG = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^<>]*>/g
const ENTITY = /&(?!(?:#\d{1,7}|#x[0-9a-fA-F]{1,6}|[a-zA-Z][a-zA-Z0-9]{1,31});)/g
const RICH_MARKER = /<\/?(p|br|ul|ol|li|strong|b|em|i|div|h[1-6])\b/i

function stripDangerous(html: string): string {
  let out = html.replace(/<!--[\s\S]*?(?:-->|$)/g, '')
  for (const tag of DROPPED_WITH_CONTENT) {
    out = out.replace(new RegExp(`<${tag}\\b[\\s\\S]*?(?:<\\/${tag}\\s*>|$)`, 'gi'), '')
  }
  return out
}

/** Échappe un segment de texte en gardant les entités HTML valides (`&eacute;`…). */
function escapeText(text: string): string {
  return text.replace(ENTITY, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function sanitizeHtml(html: string): string {
  const source = stripDangerous(html)
  const stack: string[] = []
  let out = ''
  let last = 0

  const close = (name: string) => {
    const at = stack.lastIndexOf(name)
    if (at === -1) return
    while (stack.length > at) out += `</${stack.pop()}>`
  }

  for (const match of source.matchAll(TAG)) {
    out += escapeText(source.slice(last, match.index))
    last = match.index + match[0].length

    const raw = match[1]!.toLowerCase()
    const name = ALIASES[raw] ?? raw
    if (!ALLOWED.has(name)) continue
    const closing = match[0][1] === '/'

    if (VOID.has(name)) {
      if (!closing) out += '<br>'
      continue
    }
    if (closing) {
      close(name)
      continue
    }
    // Un bloc ouvert dans un paragraphe le ferme (le navigateur fait de même).
    if (BLOCKS.has(name) && stack.includes('p')) close('p')
    // Un <li> ferme le <li> précédent de la même liste.
    if (name === 'li') {
      const lastList = Math.max(stack.lastIndexOf('ul'), stack.lastIndexOf('ol'))
      const openLi = stack.lastIndexOf('li')
      if (openLi > lastList) close('li')
    }
    stack.push(name)
    out += `<${name}>`
  }
  out += escapeText(source.slice(last))
  while (stack.length) out += `</${stack.pop()}>`
  // Paragraphes vides (div vide, <p> fermé aussitôt par un bloc) : marge parasite.
  return out.replace(/<p>(?:\s|<br>)*<\/p>/g, '')
}

/** Texte brut → paragraphes (`\n\n`) et retours à la ligne (`\n`). */
function plainToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeText(block).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

/**
 * HTML sûr à afficher avec `v-html`, `null` si la source est vide. Accepte du
 * HTML (assaini) comme du texte brut (converti en paragraphes).
 */
export function richTextHtml(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const source = input.replace(/\r\n?/g, '\n').trim()
  if (!source) return null
  const html = RICH_MARKER.test(source) ? sanitizeHtml(source) : plainToHtml(source)
  return plainText(html) ? html : null
}

// ─────────────────────────── Texte simple ───────────────────────────

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', agrave: 'à', acirc: 'â', auml: 'ä',
  ccedil: 'ç', icirc: 'î', iuml: 'ï', ocirc: 'ô', ouml: 'ö', ugrave: 'ù', ucirc: 'û', uuml: 'ü',
  Eacute: 'É', Egrave: 'È', Ecirc: 'Ê', Agrave: 'À', Ccedil: 'Ç', oelig: 'œ', OElig: 'Œ',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', laquo: '«', raquo: '»',
  hellip: '…', ndash: '–', mdash: '—', euro: '€', deg: '°', middot: '·', bull: '•'
}

function decodeEntities(text: string): string {
  return text.replace(/&(#\d{1,7}|#x[0-9a-fA-F]{1,6}|[a-zA-Z][a-zA-Z0-9]{1,31});/g, (whole, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole
    }
    return NAMED_ENTITIES[code] ?? whole
  })
}

/**
 * Texte simple d'un champ externe : balises retirées, entités décodées,
 * espaces réduits. Destiné à l'interpolation Vue (qui échappe elle-même).
 */
export function plainText(input: string): string {
  return decodeEntities(stripDangerous(input).replace(/<[^<>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}
