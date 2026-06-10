import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Users, BookOpen, Send, MessageSquare, Bug, Lightbulb, ThumbsUp, CheckCircle, X } from 'lucide-react'
import { useSEO } from '../hooks/useSEO'
import { api } from '../context/api'
import { useAuth } from '../context/AuthContext'

const FEEDBACK_TYPES = [
  { value: 'suggestion', label: '建议', icon: Lightbulb },
  { value: 'bug', label: 'Bug', icon: Bug },
  { value: 'praise', label: '好评', icon: ThumbsUp },
  { value: 'other', label: '其他', icon: MessageSquare },
]

export default function About() {
  const { isAuthenticated, user } = useAuth()
  const [form, setForm] = useState({
    name: isAuthenticated ? (user?.username || '') : '',
    email: isAuthenticated ? (user?.email || '') : '',
    type: 'suggestion',
    content: ''
  })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useSEO({ title: '关于 - BlogHub', description: 'BlogHub 是一个全功能的博客平台，支持 Markdown 写作和社区互动。' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.content.trim()) return
    setSending(true)
    setError('')
    try {
      await api.feedback.send(form)
      setSent(true)
    } catch (err) {
      setError(err.message || '提交失败，请稍后重试')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">关于 BlogHub</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">一个全功能的博客平台</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 mb-8">
        <h2 className="text-2xl font-bold mb-4">我们的使命</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          BlogHub 致力于为创作者提供一个简洁、强大且美观的写作平台。我们相信，每个人都有值得分享的故事和知识。
        </p>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="text-center p-6 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <BookOpen className="w-10 h-10 text-primary mx-auto mb-3" />
            <h3 className="font-bold mb-2">Markdown 写作</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">支持语法高亮，随时随地记录灵感</p>
          </div>
          <div className="text-center p-6 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <Users className="w-10 h-10 text-primary mx-auto mb-3" />
            <h3 className="font-bold mb-2">社区互动</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">点赞、评论、收藏，与读者深度互动</p>
          </div>
          <div className="text-center p-6 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <Heart className="w-10 h-10 text-primary mx-auto mb-3" />
            <h3 className="font-bold mb-2">响应式设计</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">亮色/暗色主题，适配所有设备</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-4">技术栈</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {['React', 'Vite', 'Tailwind CSS', 'Express', 'MySQL', 'JWT', 'Markdown', 'Railway'].map(tech => (
            <div key={tech} className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-center font-medium text-sm">
              {tech}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 mb-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <MessageSquare size={24} />
          意见反馈
        </h2>

        {sent ? (
          <div className="relative bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 animate-slide-up">
            <button
              onClick={() => { setSent(false); setError(''); setForm({ name: '', email: '', type: 'suggestion', content: '' }) }}
              className="absolute top-3 right-3 p-1 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-800/40 rounded-lg transition"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="text-green-500" size={28} />
              <h3 className="text-xl font-bold text-green-800 dark:text-green-300">感谢你的反馈！</h3>
            </div>
            <p className="text-green-700 dark:text-green-400 ml-11">我们会认真对待每一条建议，持续改进 BlogHub。</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">昵称</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="你的昵称"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">邮箱</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="你的邮箱（可选）"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">反馈类型</label>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, type: value })}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition ${
                      form.type === value
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">反馈内容 *</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="告诉我们你的想法、建议或遇到的问题..."
                rows={4}
                required
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:border-primary resize-none"
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2">{error}</p>
            )}
            <button
              type="submit"
              disabled={sending || !form.content.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-secondary transition disabled:opacity-50 font-medium"
            >
              <Send size={18} />
              {sending ? '发送中...' : '提交反馈'}
            </button>
            {isAuthenticated && (
              <p className="text-xs text-gray-400 mt-1">已登录为 <strong>{user?.username}</strong>，昵称和邮箱已自动填写</p>
            )}
          </form>
        )}
      </div>

      <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-8 text-white text-center">
        <h2 className="text-2xl font-bold mb-4">开始你的创作之旅</h2>
        <p className="mb-6 opacity-90">加入我们，分享你的想法和经验</p>
        <Link
          to="/register"
          className="inline-block px-8 py-3 bg-white dark:bg-gray-800 text-primary font-semibold rounded-full hover:bg-gray-100 transition"
        >
          立即注册
        </Link>
      </div>
    </div>
  )
}
