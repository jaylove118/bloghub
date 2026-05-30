import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Users, FileText, MessageCircle, TrendingUp } from 'lucide-react'
import { useSEO } from '../hooks/useSEO'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Admin() {
  useSEO({ title: '管理后台 - BlogHub', description: 'BlogHub 管理后台' })
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner />

  const cards = [
    { label: '文章总数', value: stats?.totalPosts || 0, icon: <FileText size={24} />, color: 'from-blue-500 to-blue-600' },
    { label: '用户总数', value: stats?.totalUsers || 0, icon: <Users size={24} />, color: 'from-green-500 to-green-600' },
    { label: '评论总数', value: stats?.totalComments || 0, icon: <MessageCircle size={24} />, color: 'from-purple-500 to-purple-600' },
    { label: '总访问量', value: stats?.totalViews || 0, icon: <Eye size={24} />, color: 'from-amber-500 to-amber-600' },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">管理后台</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(card => (
          <div key={card.label} className={`bg-gradient-to-br ${card.color} rounded-xl p-5 text-white`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm opacity-80">{card.label}</span>
              {card.icon}
            </div>
            <div className="text-3xl font-bold">{card.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-primary" />
            <h2 className="font-bold dark:text-gray-200">热门文章 TOP 5</h2>
          </div>
          {stats?.topPosts?.length ? (
            <div className="space-y-3">
              {stats.topPosts.map((p, i) => (
                <Link key={p.id} to={`/blog/${p.id}`} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:text-primary transition">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                      {i + 1}
                    </span>
                    <span className="text-sm dark:text-gray-200 truncate max-w-[240px]">{p.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1"><Eye size={12} />{p.view_count}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={12} />{p.comment_count}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : <p className="text-gray-500 text-sm">暂无数据</p>}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-primary" />
            <h2 className="font-bold dark:text-gray-200">最新用户</h2>
          </div>
          {stats?.recentUsers?.length ? (
            <div className="space-y-3">
              {stats.recentUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                      {u.username?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium dark:text-gray-200">{u.username}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{new Date(u.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-sm">暂无数据</p>}
        </div>
      </div>
    </div>
  )
}
