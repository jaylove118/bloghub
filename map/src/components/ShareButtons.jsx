import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Share2, Copy, Check, X, MessageCircle } from 'lucide-react'

export function ShareButtons({ title, url }) {
  const [open, setOpen] = useState(false)
  const shareUrl = url || window.location.href
  const shareTitle = title || document.title

  const shareLinks = [
    {
      name: '微信',
      icon: <MessageCircle size={18} />,
      color: 'bg-green-500 hover:bg-green-600',
      action: () => {
        navigator.clipboard.writeText(`${shareTitle}\n${shareUrl}`).then(() => {
          alert('链接已复制，可粘贴到微信分享')
        })
      },
    },
    {
      name: '微博',
      icon: <Share2 size={18} />,
      color: 'bg-red-500 hover:bg-red-600',
      action: () => {
        window.open(`https://service.weibo.com/share/share.php?title=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`, '_blank', 'width=600,height=400')
      },
    },
    {
      name: 'QQ',
      icon: <MessageCircle size={18} />,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => {
        window.open(`https://connect.qq.com/widget/shareqq/index.html?title=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`, '_blank', 'width=600,height=400')
      },
    },
    {
      name: '复制链接',
      icon: <Copy size={18} />,
      color: 'bg-gray-500 hover:bg-gray-600',
      action: () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
          alert('链接已复制到剪贴板')
        })
      },
    },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-3 py-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm"
      >
        <Share2 size={16} />
        <span className="hidden sm:inline">分享</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 py-2 w-44">
            <div className="flex items-center justify-between px-4 py-1 mb-1">
              <span className="text-sm font-medium dark:text-gray-200">分享到</span>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            </div>
            {shareLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => { link.action(); setOpen(false) }}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition text-sm dark:text-gray-200"
              >
                <span className={`w-8 h-8 flex items-center justify-center rounded-full text-white ${link.color}`}>
                  {link.icon}
                </span>
                {link.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function CodeCopyButton() {
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    const handler = (e) => {
      const pre = e.target.closest('pre')
      if (!pre) return

      let btn = pre.querySelector('.code-copy-btn')
      if (!btn) {
        btn = document.createElement('button')
        btn.className = 'code-copy-btn absolute top-2 right-2 p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity text-xs'
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'
        pre.style.position = 'relative'
        pre.classList.add('group')
        pre.appendChild(btn)

        btn.addEventListener('click', () => {
          const code = pre.querySelector('code')
          if (code) {
            navigator.clipboard.writeText(code.textContent).then(() => {
              btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
              setTimeout(() => {
                btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'
              }, 2000)
            })
          }
        })
      }
    }

    document.addEventListener('mouseover', handler)
    return () => document.removeEventListener('mouseover', handler)
  }, [])

  return null
}
