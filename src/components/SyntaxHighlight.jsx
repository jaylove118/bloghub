import { useEffect, useRef, useState } from 'react'

export default function SyntaxHighlight({ children, className = '' }) {
  const ref = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    import('highlight.js').then(({ default: hljs }) => {
      if (cancelled) return
      import('highlight.js/styles/github-dark.css')
      if (ref.current) {
        ref.current.querySelectorAll('pre code').forEach((block) => {
          hljs.highlightElement(block)
        })
      }
      setReady(true)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!ready || !ref.current) return
    import('highlight.js').then(({ default: hljs }) => {
      ref.current.querySelectorAll('pre code:not(.hljs)').forEach((block) => {
        hljs.highlightElement(block)
      })
    }).catch(() => {})
  }, [children, ready])

  return <div ref={ref} className={className}>{children}</div>
}
