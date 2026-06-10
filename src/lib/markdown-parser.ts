export interface ParseOptions {
  enableHeading?: boolean
  enableBold?: boolean
  enableItalic?: boolean
  enableStrikethrough?: boolean
  enableCode?: boolean
  enableLink?: boolean
  enableImage?: boolean
  enableList?: boolean
  enableBlockquote?: boolean
  enableHorizontalRule?: boolean
}

type InlineParser = (text: string) => string

const DEFAULT_OPTIONS: Required<ParseOptions> = {
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
}

const DANGEROUS_PROTOCOLS = /^(javascript|data|vbscript):/i

function sanitizeUrl(url: string): string {
  if (DANGEROUS_PROTOCOLS.test(url.trim())) {
    return ''
  }
  return url
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function parseInline(text: string, options: Required<ParseOptions>): string {
  let result = escapeHtml(text)

  if (options.enableImage) {
    result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m: string, alt: string, url: string) =>
      '<a href="' + sanitizeUrl(url) + '" class="prose-img-link" target="_blank"><img src="' + sanitizeUrl(url) + '" alt="' + alt + '" class="prose-img" loading="lazy" /></a>'
    )
  }

  if (options.enableLink) {
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m: string, text: string, url: string) =>
      '<a href="' + sanitizeUrl(url) + '" target="_blank" rel="noopener noreferrer">' + text + '</a>'
    )
  }

  if (options.enableBold) {
    result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    result = result.replace(/__(.+?)__/g, '<strong>$1</strong>')
  }

  if (options.enableItalic) {
    result = result.replace(/\*(.+?)\*/g, '<em>$1</em>')
    result = result.replace(/_(.+?)_/g, '<em>$1</em>')
  }

  if (options.enableStrikethrough) {
    result = result.replace(/~~(.+?)~~/g, '<del>$1</del>')
  }

  if (options.enableCode) {
    result = result.replace(/`([^`]+)`/g, '<code>$1</code>')
  }

  return result
}

function parseCodeBlock(lines: string[], start: number): { html: string; consumed: number } | null {
  const fence = lines[start].match(/^```(\w*)$/)
  if (!fence) return null

  const lang = fence[1] || ''
  const codeLines: string[] = []
  let i = start + 1

  while (i < lines.length) {
    if (lines[i].match(/^```\s*$/)) {
      const code = escapeHtml(codeLines.join('\n'))
      return {
        html: '<pre><code class="language-' + lang + '">' + code + '</code></pre>',
        consumed: i - start + 1,
      }
    }
    codeLines.push(lines[i])
    i++
  }

  const code = escapeHtml(codeLines.join('\n'))
  return {
    html: '<pre><code class="language-' + lang + '">' + code + '</code></pre>',
    consumed: i - start,
  }
}

function parseUnorderedList(lines: string[], start: number): { html: string; consumed: number } | null {
  if (!lines[start].match(/^[-*+]\s/)) return null

  const items: string[] = []
  let i = start

  while (i < lines.length && lines[i].match(/^[-*+]\s/)) {
    const content = parseInline(lines[i].replace(/^[-*+]\s/, ''), DEFAULT_OPTIONS)
    items.push('<li>' + content + '</li>')
    i++
  }

  return {
    html: '<ul>' + items.join('') + '</ul>',
    consumed: i - start,
  }
}

function parseOrderedList(lines: string[], start: number): { html: string; consumed: number } | null {
  if (!lines[start].match(/^\d+\.\s/)) return null

  const items: string[] = []
  let i = start

  while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
    const content = parseInline(lines[i].replace(/^\d+\.\s/, ''), DEFAULT_OPTIONS)
    items.push('<li>' + content + '</li>')
    i++
  }

  return {
    html: '<ol>' + items.join('') + '</ol>',
    consumed: i - start,
  }
}

function parseBlockquote(lines: string[], start: number): { html: string; consumed: number } | null {
  if (!lines[start].startsWith('> ')) return null

  const quoteLines: string[] = []
  let i = start

  while (i < lines.length && lines[i].startsWith('> ')) {
    quoteLines.push(lines[i].slice(2))
    i++
  }

  const content = parseBlocks(quoteLines.join('\n'))
  return {
    html: '<blockquote>' + content + '</blockquote>',
    consumed: i - start,
  }
}

function parseHeading(line: string): string | null {
  const match = line.match(/^(#{1,6})\s+(.+)$/)
  if (!match) return null

  const level = match[1].length
  const content = parseInline(match[2], DEFAULT_OPTIONS)
  return '<h' + level + '>' + content + '</h' + level + '>'
}

function parseHorizontalRule(line: string): string | null {
  if (line.match(/^(-{3,}|\*{3,}|_{3,})\s*$/)) {
    return '<hr />'
  }
  return null
}

export function parseBlocks(input: string, options: Partial<ParseOptions> = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  if (!input) return ''

  const lines = input.split('\n')
  const htmlParts: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      i++
      continue
    }

    if (opts.enableCode) {
      const codeResult = parseCodeBlock(lines, i)
      if (codeResult) {
        htmlParts.push(codeResult.html)
        i += codeResult.consumed
        continue
      }
    }

    if (opts.enableBlockquote) {
      const quoteResult = parseBlockquote(lines, i)
      if (quoteResult) {
        htmlParts.push(quoteResult.html)
        i += quoteResult.consumed
        continue
      }
    }

    if (opts.enableList) {
      const ulResult = parseUnorderedList(lines, i)
      if (ulResult) {
        htmlParts.push(ulResult.html)
        i += ulResult.consumed
        continue
      }

      const olResult = parseOrderedList(lines, i)
      if (olResult) {
        htmlParts.push(olResult.html)
        i += olResult.consumed
        continue
      }
    }

    if (opts.enableHorizontalRule) {
      const hrResult = parseHorizontalRule(line)
      if (hrResult) {
        htmlParts.push(hrResult)
        i++
        continue
      }
    }

    if (opts.enableHeading) {
      const headingResult = parseHeading(line)
      if (headingResult) {
        htmlParts.push(headingResult)
        i++
        continue
      }
    }

    const paragraphLines: string[] = []
    while (i < lines.length && lines[i].trim() !== '') {
      paragraphLines.push(lines[i])
      i++
    }

    if (paragraphLines.length > 0) {
      const content = parseInline(paragraphLines.join('\n'), opts)
      htmlParts.push('<p>' + content + '</p>')
    }
  }

  return htmlParts.join('')
}

export function parseMarkdown(input: string, options?: ParseOptions): string {
  return parseBlocks(input, options)
}
