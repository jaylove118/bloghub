import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Share2, Copy, Check, X, MessageCircle } from 'lucide-react'

export function ShareButtons({ title, url }) {
  const [open, setOpen] = useState(false)
  const shareUrl = url || window.location.href
  const shareTitle = title || document.title

  const copyText = async (text, msg) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    alert(msg)
  }

  const shareLinks = [
    {
      name: '微信',
      icon: <MessageCircle size={18} />,
      color: 'bg-green-500 hover:bg-green-600',
      action: () => copyText(`${shareTitle}\n${shareUrl}`, '链接已复制，可粘贴到微信分享'),
    },
    {
      name: '微博',
      icon: <Share2 size={18} />,
      color: 'bg-red-500 hover:bg-red-600',
      action: () => {
        const w = window.open(`https://service.weibo.com/share/share.php?title=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`, '_blank', 'width=600,height=400')
        if (!w) copyText(shareUrl, '弹窗被拦截，链接已复制，可手动粘贴分享')
      },
    },
    {
      name: 'QQ',
      icon: <MessageCircle size={18} />,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => {
        const w = window.open(`https://connect.qq.com/widget/shareqq/index.html?title=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}`, '_blank', 'width=600,height=400')
        if (!w) copyText(shareUrl, '弹窗被拦截，链接已复制，可手动粘贴分享')
      },
    },
    {
      name: '复制链接',
      icon: <Copy size={18} />,
      color: 'bg-gray-500 hover:bg-gray-600',
      action: () => copyText(shareUrl, '链接已复制到剪贴板'),
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
  useEffect(() => {
    const addedButtons = new Set()
    const clickHandlers = new WeakMap()

    const addCopyButton = (pre) => {
      if (pre.querySelector('.code-copy-btn')) return

      const btn = document.createElement('button')
      btn.className = 'code-copy-btn absolute top-2 right-2 p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity text-xs'
      btn.textContent = '复制'
      pre.style.position = 'relative'
      pre.classList.add('group')
      pre.appendChild(btn)
      addedButtons.add(btn)

      const clickHandler = async () => {
        const code = pre.querySelector('code')
        if (code) {
          try {
            await navigator.clipboard.writeText(code.textContent)
            btn.textContent = '已复制'
            setTimeout(() => { btn.textContent = '复制' }, 2000)
          } catch {}
        }
      }
      btn.addEventListener('click', clickHandler)
      clickHandlers.set(btn, clickHandler)
    }

    const mouseoverHandler = (e) => {
      const pre = e.target.closest('pre')
      if (pre) addCopyButton(pre)
    }

    document.addEventListener('mouseover', mouseoverHandler, { passive: true })

    return () => {
      document.removeEventListener('mouseover', mouseoverHandler)
      addedButtons.forEach((btn) => {
        const handler = clickHandlers.get(btn)
        if (handler) btn.removeEventListener('click', handler)
        btn.remove()
      })
    }
  }, [])

  return null
}
