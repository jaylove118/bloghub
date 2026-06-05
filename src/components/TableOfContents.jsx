import { useState, useEffect, useMemo } from 'react'

export default function useTableOfContents(content) {
  const [activeId, setActiveId] = useState('')

  const headings = useMemo(() => {
    const regex = /^(#{1,3})\s+(.+)$/gm
    const result = []
    let match
    while ((match = regex.exec(content)) !== null) {
      result.push({
        level: match[1].length,
        text: match[2].replace(/[`*\[\]()]/g, ''),
        id: 'toc-' + match[2].replace(/[^a-zA-Z0-9一-鿿]+/g, '-').replace(/-+$/g, '').toLowerCase(),
      })
    }
    return result
  }, [content])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        })
      },
      { rootMargin: '-80px 0px -80% 0px' }
    )
    headings.forEach((h) => {
      const el = document.getElementById(h.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [headings])

  const addIds = useMemo(() => {
    return (html) => {
      let result = html
      headings.forEach((h) => {
        result = result.replace(
          new RegExp(`<h${h.level}>${h.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h${h.level}>`, 'i'),
          `<h${h.level} id="${h.id}">${h.text}</h${h.level}>`
        )
      })
      return result
    }
  }, [headings])

  if (headings.length < 3) return null

  return {
    headings,
    activeId,
    addIds,
    toc: (
      <nav className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <h4 className="font-semibold text-sm mb-3 dark:text-gray-200">目录</h4>
        <ul className="space-y-1">
          {headings.map((h) => (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' })
                }}
                className={`block text-sm py-0.5 transition truncate ${
                  h.level === 1 ? 'pl-0' : h.level === 2 ? 'pl-3' : 'pl-6'
                } ${
                  activeId === h.id
                    ? 'text-primary font-medium'
                    : 'text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary'
                }`}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    ),
  }
}
