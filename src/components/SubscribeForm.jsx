import { useState } from 'react'
import { api } from '../context/api'

export default function SubscribeForm({ variant = 'inline' }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    try {
      const data = await api.subscribers.subscribe(email.trim())
      setMessage(data.message || '订阅成功！')
      setStatus('success')
      setEmail('')
    } catch (err) {
      setMessage(err.message || '订阅失败，请重试')
      setStatus('error')
    }
  }

  if (variant === 'footer') {
    return (
      <div>
        <h4 className="font-semibold mb-2">订阅更新</h4>
        <p className="text-sm text-gray-400 mb-3">获取最新文章和博客动态</p>
        {status === 'success' ? (
          <p className="text-green-400 text-sm">{message}</p>
        ) : (
          <form onSubmit={handleSubscribe} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="输入邮箱"
              className="flex-1 px-3 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-primary text-gray-100"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-secondary transition disabled:opacity-50"
            >
              {status === 'loading' ? '...' : '订阅'}
            </button>
          </form>
        )}
        {status === 'error' && <p className="text-red-400 text-sm mt-1">{message}</p>}
      </div>
    )
  }

  return (
    <div className="p-6 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl">
      <div className="max-w-md mx-auto text-center">
        <h3 className="text-xl font-bold mb-2">订阅我们的博客</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">获取最新文章、技术分享和博客动态</p>
        {status === 'success' ? (
          <p className="text-green-500 font-medium">{message}</p>
        ) : (
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="输入你的邮箱"
              className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-xl focus:outline-none focus:border-primary"
              required
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-secondary transition disabled:opacity-50 font-medium"
            >
              {status === 'loading' ? '订阅中...' : '订阅'}
            </button>
          </form>
        )}
        {status === 'error' && <p className="text-red-500 text-sm mt-2">{message}</p>}
      </div>
    </div>
  )
}
