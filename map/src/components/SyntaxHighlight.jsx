import { useEffect, useRef } from 'react'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'

export default function SyntaxHighlight({ children, className = '' }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block)
    })
  }, [children])

  return <div ref={ref} className={className}>{children}</div>
}
