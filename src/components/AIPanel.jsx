import { useState, useRef, useEffect } from 'react'
import { api } from '../context/api'
import { Sparkles, ChevronDown, ChevronUp, Copy, Check, Loader2 } from 'lucide-react'

const OPERATIONS = [
  { key: 'continue', label: 'AI 续写', desc: '根据上文续写下一段', icon: '✍️', needsSelection: false },
  { key: 'polish', label: 'AI 润色', desc: '优化选中文字的表述', icon: '✨', needsSelection: true },
  { key: 'outline', label: 'AI 大纲', desc: '根据标题生成文章大纲', icon: '📋', needsSelection: false },
  { key: 'summary', label: 'AI 摘要', desc: '自动生成文章摘要', icon: '📝', needsSelection: false },
]

export default function AIPanel({ title, content, category, selectedText, onInsert, textareaRef }) {
  const [open, setOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const resultRef = useRef(null)

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight
    }
  }, [result])

  const handleGenerate = async (operation) => {
    if (generating) return

    const op = OPERATIONS.find(o => o.key === operation)
    let inputContent = content

    if (op.needsSelection && !selectedText) {
      setError('请先在编辑器中选中需要润色的文字')
      return
    }

    if (operation === 'polish') {
      inputContent = selectedText
    }

    setGenerating(true)
    setResult('')
    setError('')

    try {
      const token = localStorage.getItem('bloghub_token')
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          operation,
          content: inputContent,
          context: { title, category },
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || '请求失败')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)
          if (data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.error) {
              setError(parsed.error)
            } else if (parsed.text) {
              setResult(prev => prev + parsed.text)
            }
          } catch {}
        }
      }
    } catch (err) {
      setError(err.message || 'AI 服务连接失败')
    } finally {
      setGenerating(false)
    }
  }

  const handleInsert = () => {
    if (!result.trim()) return
    onInsert(result)
    setResult('')
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="border-b border-gray-100 dark:border-gray-700">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
      >
        <span className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          AI 写作助手
          {generating && <Loader2 size={14} className="animate-spin text-primary" />}
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 animate-slide-up">
          <div className="flex flex-wrap gap-2">
            {OPERATIONS.map(op => (
              <button
                key={op.key}
                type="button"
                disabled={generating}
                onClick={() => handleGenerate(op.key)}
                title={op.desc}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition disabled:opacity-50 ${
                  op.key === 'continue'
                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <span>{op.icon}</span>
                <span>{op.label}</span>
              </button>
            ))}
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center justify-between">
              <span>{error}</span>
              <button type="button" onClick={() => setError('')} className="text-red-400 hover:text-red-600">&times;</button>
            </div>
          )}

          {(result || generating) && (
            <div className="space-y-2">
              <div
                ref={resultRef}
                className="max-h-48 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed"
              >
                {result || (generating && <span className="inline-flex items-center gap-1 text-gray-400"><Loader2 size={14} className="animate-spin" />生成中...</span>)}
              </div>
              {result && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleInsert}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs rounded-lg hover:bg-secondary transition"
                  >
                    插入编辑器
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                  >
                    {copied ? <><Check size={14} />已复制</> : <><Copy size={14} />复制</>}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
