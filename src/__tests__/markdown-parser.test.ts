import { describe, it, expect } from 'vitest'
import { parseMarkdown, escapeHtml, parseInline } from '../lib/markdown-parser'

describe('escapeHtml', () => {
  it('escapes < and > in plain text', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    )
  })

  it('escapes ampersands', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B')
  })

  it('escapes double quotes', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;')
  })

  it('returns empty string for empty input', () => {
    expect(escapeHtml('')).toBe('')
  })
})

describe('parseInline', () => {
  const opts = {
    enableHeading: true,
    enableBold: true,
    enableItalic: true,
    enableStrikethrough: true,
    enableCode: true,
    enableLink: true,
    enableImage: true,
    enableList: true,
    enableBlockquote: true,
    enableHorizontalRule: true,
  } as const

  it('parses **bold** text', () => {
    expect(parseInline('hello **world**!', opts)).toBe('hello <strong>world</strong>!')
  })

  it('parses *italic* text', () => {
    expect(parseInline('hello *world*!', opts)).toBe('hello <em>world</em>!')
  })

  it('parses ~~strikethrough~~', () => {
    expect(parseInline('hello ~~old~~ new', opts)).toBe('hello <del>old</del> new')
  })

  it('parses inline `code`', () => {
    const bt = String.fromCharCode(96)
    expect(parseInline('use ' + bt + 'const' + bt + ' keyword', opts)).toBe('use <code>const</code> keyword')
  })

  it('parses links', () => {
    expect(parseInline('[click here](https://example.com)', opts)).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">click here</a>'
    )
  })

  it('parses images', () => {
    expect(parseInline('![alt text](https://img.com/pic.png)', opts)).toBe(
      '<img src="https://img.com/pic.png" alt="alt text" class="prose-img" />'
    )
  })

  it('renders plain text as-is (escaped)', () => {
    expect(parseInline('just some text', opts)).toBe('just some text')
  })

  it('handles empty string', () => {
    expect(parseInline('', opts)).toBe('')
  })
})

describe('parseMarkdown (blocks)', () => {
  it('parses headings h1 through h6', () => {
    expect(parseMarkdown('# Heading 1')).toBe('<h1>Heading 1</h1>')
    expect(parseMarkdown('## Heading 2')).toBe('<h2>Heading 2</h2>')
    expect(parseMarkdown('###### Heading 6')).toBe('<h6>Heading 6</h6>')
  })

  it('does not parse # with no space as heading', () => {
    expect(parseMarkdown('#not a heading')).toBe('<p>#not a heading</p>')
  })

  it('parses unordered lists', () => {
    const md = '- item one\n- item two\n- item three'
    expect(parseMarkdown(md)).toBe('<ul><li>item one</li><li>item two</li><li>item three</li></ul>')
  })

  it('parses unordered lists with + and *', () => {
    expect(parseMarkdown('+ apple\n+ orange')).toBe('<ul><li>apple</li><li>orange</li></ul>')
    expect(parseMarkdown('* star\n* moon')).toBe('<ul><li>star</li><li>moon</li></ul>')
  })

  it('parses ordered lists', () => {
    const md = '1. first\n2. second\n3. third'
    expect(parseMarkdown(md)).toBe('<ol><li>first</li><li>second</li><li>third</li></ol>')
  })

  it('parses code blocks with language', () => {
    const bt = String.fromCharCode(96).repeat(3)
    const md = bt + 'javascript\nconst x = 1;\nconsole.log(x);\n' + bt
    const result = parseMarkdown(md)
    expect(result).toContain('<pre><code class="language-javascript">')
    expect(result).toContain('const x = 1;')
  })

  it('parses blockquotes', () => {
    const md = '> This is a quote\n> second line'
    const result = parseMarkdown(md)
    expect(result).toContain('<blockquote>')
    expect(result).toContain('This is a quote')
    expect(result).toContain('second line')
  })

  it('parses horizontal rules', () => {
    expect(parseMarkdown('---')).toBe('<hr />')
    expect(parseMarkdown('***')).toBe('<hr />')
    expect(parseMarkdown('___')).toBe('<hr />')
  })

  it('wraps plain text in paragraphs', () => {
    expect(parseMarkdown('hello world')).toBe('<p>hello world</p>')
  })

  it('handles multi-paragraph text', () => {
    const md = 'first paragraph\n\nsecond paragraph'
    const result = parseMarkdown(md)
    expect(result).toBe('<p>first paragraph</p><p>second paragraph</p>')
  })

  it('returns empty string for empty input', () => {
    expect(parseMarkdown('')).toBe('')
  })

  it('handles complex mixed content', () => {
    const bt = String.fromCharCode(96).repeat(3)
    const md = [
      '# My Title',
      '',
      'This is **bold** and *italic* text.',
      '',
      '- item one',
      '- item two',
      '',
      '> A quote here',
      '',
      bt + '\nconst x = 1;\n' + bt,
    ].join('\n')

    const result = parseMarkdown(md)
    expect(result).toContain('<h1>My Title</h1>')
    expect(result).toContain('<strong>bold</strong>')
    expect(result).toContain('<em>italic</em>')
    expect(result).toContain('<li>item one</li>')
    expect(result).toContain('<blockquote>')
    expect(result).toContain('<pre>')
    expect(result).toContain('const x = 1;')
  })

  it('respects disabled options', () => {
    const result = parseMarkdown('## Heading\n\n**bold text**', {
      enableHeading: false,
      enableBold: false,
    })
    expect(result).not.toContain('<h2>')
    expect(result).not.toContain('<strong>')
  })

  it('bold and italic can be combined', () => {
    const result = parseMarkdown('This is **bold** and also *italic*.')
    expect(result).toContain('<strong>bold</strong>')
    expect(result).toContain('<em>italic</em>')
  })

  it('handles inline code inside a paragraph with bold', () => {
    const bt = String.fromCharCode(96)
    const result = parseMarkdown('Use the **' + bt + 'map' + bt + ' function** carefully.')
    // Bold wrapping code is odd ordering but should work
    expect(result).toContain('<strong>')
    expect(result).toContain('<code>map</code>')
  })
})
