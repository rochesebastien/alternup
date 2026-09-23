import { describe, expect, it } from 'vitest'
import { plainText, richTextHtml } from '~/shared/utils/rich-text'

describe('richTextHtml', () => {
  it('conserve la mise en forme d\'une annonce LBA', () => {
    const html = richTextHtml(
      '<p> <strong> <strong>Bienvenue chez REDSUP</strong> </strong> </p> <ul> <li> <p> <strong>Former</strong> : des experts. </p> </li> </ul>'
    )
    expect(html).toBe(
      '<p> <strong> <strong>Bienvenue chez REDSUP</strong> </strong> </p> <ul> <li> <p> <strong>Former</strong> : des experts. </p> </li> </ul>'
    )
  })

  it('retire tous les attributs, y compris les gestionnaires d\'évènements', () => {
    expect(richTextHtml('<p class="x" onclick="alert(1)" style="color:red">Texte</p>')).toBe('<p>Texte</p>')
  })

  it('supprime script, style et iframe avec leur contenu', () => {
    expect(richTextHtml('<p>Avant</p><script>alert(1)</script><style>p{}</style><iframe src="x"></iframe><p>Après</p>'))
      .toBe('<p>Avant</p><p>Après</p>')
    expect(richTextHtml('<p>ok</p><script>alert(1)')).toBe('<p>ok</p>')
  })

  it('neutralise les balises non autorisées et les liens', () => {
    expect(richTextHtml('<p><a href="javascript:alert(1)">clic</a> <img src=x onerror=alert(1)></p>'))
      .toBe('<p>clic </p>')
    expect(richTextHtml('<p>1 < 2 et <b>gras</b></p>')).toBe('<p>1 &lt; 2 et <strong>gras</strong></p>')
  })

  it('ne peut pas être contourné par une balise mal formée', () => {
    const html = richTextHtml('<p>x</p><scr<script>ipt>alert(1)</script>') ?? ''
    expect(html).not.toMatch(/<script/i)
    expect(richTextHtml('<p>x<svg><p onload=alert(1)>')).not.toMatch(/onload|<svg/i)
  })

  it('rééquilibre les balises comme un navigateur', () => {
    expect(richTextHtml('<p>un<p>deux')).toBe('<p>un</p><p>deux</p>')
    expect(richTextHtml('<p>intro<ul><li>a<li>b</ul>')).toBe('<p>intro</p><ul><li>a</li><li>b</li></ul>')
    expect(richTextHtml('</strong>texte</p><p>ok')).toBe('texte<p>ok</p>')
  })

  it('normalise les alias (b, i, div, h1)', () => {
    expect(richTextHtml('<div><h1>Titre</h1><i>note</i></div>')).toBe('<h3>Titre</h3><em>note</em>')
  })

  it('garde les entités valides et échappe les « & » nus', () => {
    expect(richTextHtml('<p>Caf&eacute; &amp; th&#233; & co</p>')).toBe('<p>Caf&eacute; &amp; th&#233; &amp; co</p>')
  })

  it('convertit un texte brut en paragraphes', () => {
    expect(richTextHtml('Ligne 1\nLigne 2\n\nParagraphe 2 <3')).toBe(
      '<p>Ligne 1<br>Ligne 2</p><p>Paragraphe 2 &lt;3</p>'
    )
  })

  it('renvoie null pour une source vide ou sans texte', () => {
    expect(richTextHtml(null)).toBeNull()
    expect(richTextHtml('   ')).toBeNull()
    expect(richTextHtml('<p> </p><script>x</script>')).toBeNull()
  })
})

describe('plainText', () => {
  it('retire les balises, décode les entités et réduit les espaces', () => {
    expect(plainText('<b>Caf&eacute;</b>  &amp;\n th&#233; &rsquo; &nbsp;ok')).toBe('Café & thé ’ ok')
  })

  it('laisse une entité inconnue telle quelle', () => {
    expect(plainText('a &inconnu; b')).toBe('a &inconnu; b')
  })
})
