import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Eye, Users, FileText, MessageCircle, TrendingUp, Mail, Trash2, Pin, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSEO } from '../hooks/useSEO'
import LoadingSpinner from '../components/LoadingSpinner'
import { api } from '../context/api'

function SimpleBarChart({ data, labelKey, valueKey, color = 'bg-primary' }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1)
  return (
    <div className="space-y-2">
      {data.slice(0, 10).map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-28 truncate text-gray-600 dark:text-gray-400">{item[labelKey]}</span>
          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${color}`}
              style={{ width: `${(item[valueKey] / max) * 100}%`, minWidth: item[valueKey] > 0 ? '20px' : 0 }}
            />
          </div>
          <span className="w-10 text-right text-gray-500">{item[valueKey]}</span>
        </div>
      ))}
    </div>
  )
}

export default function Admin() {
  useSEO({ title: '管理后台 - BlogHub', description: 'BlogHub 管理后台' })
  const { user, isLoading: authLoading, isAuthenticated, isAdmin } = useAuth()
  const [stats, setStats] = useState(null)
  const [subscribers, setSubscribers] = useState([])
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState({ daily: [], topReferrers: [] })
  const [adminPosts, setAdminPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [postsPage, setPostsPage] = useState(1)
  const [postsTotal, setPostsTotal] = useState(0)
  const [adminUsers, setAdminUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersPage, setUsersPage] = useState(1)
  const [usersTotal, setUsersTotal] = useState(0)
  const [feedbacks, setFeedbacks] = useState([])

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, subRes, anaRes] = await Promise.allSettled([
          api.request('/admin/stats'),
          api.request('/subscribers'),
          api.request('/admin/analytics'),
        ])
        setStats(statsRes.status === 'fulfilled' ? statsRes.value : null)
        setSubscribers(subRes.status === 'fulfilled' ? (subRes.value.subscribers || []) : [])
        setAnalytics(anaRes.status === 'fulfilled' ? anaRes.value : { daily: [], topReferrers: [] })
      } catch {}
      try {
        const fbRes = await api.request('/feedback')
        setFeedbacks(fbRes.feedbacks || [])
      } catch {}
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    const fetchPosts = async () => {
      setPostsLoading(true)
      try {
        const result = await api.posts.adminGetAll({ page: postsPage, limit: 20 })
        setAdminPosts(result.posts)
        setPostsTotal(result.pagination.total)
      } catch {}
      setPostsLoading(false)
    }
    fetchPosts()
  }, [postsPage])

  useEffect(() => {
    const fetchUsers = async () => {
      setUsersLoading(true)
      try {
        const result = await api.admin.getUsers({ page: usersPage, limit: 20 })
        setAdminUsers(result.users)
        setUsersTotal(result.pagination.total)
      } catch {}
      setUsersLoading(false)
    }
    fetchUsers()
  }, [usersPage])

  const handleDeleteSubscriber = async (email) => {
    if (!window.confirm('确定删除这个订阅者？')) return
    try {
      await api.request('/subscribers/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setSubscribers(prev => prev.filter(s => s.email !== email))
    } catch {}
  }

  const handleAdminDeletePost = async (postId) => {
    if (!window.confirm('确定要删除这篇文章吗？此操作不可撤销。')) return
    try {
      await api.posts.delete(postId)
      setAdminPosts(prev => prev.filter(p => p.id !== postId))
      setPostsTotal(prev => prev - 1)
    } catch {}
  }

  const handleAdminToggleFeature = async (postId) => {
    try {
      const newPinned = await api.posts.pin(postId)
      setAdminPosts(prev => prev.map(p => p.id === postId ? { ...p, isPinned: newPinned } : p))
    } catch {}
  }

  const handleAdminDeleteUser = async (userId) => {
    if (!window.confirm('确定要删除这个用户吗？其所有文章和评论也将被删除。')) return
    try {
      await api.admin.deleteUser(userId)
      setAdminUsers(prev => prev.filter(u => u.id !== userId))
      setUsersTotal(prev => prev - 1)
    } catch {}
  }

  if (loading || authLoading) return <LoadingSpinner />
  if (!isAuthenticated || !isAdmin) return <Navigate to="/" replace />

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

      {analytics.daily?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-primary" />
            <h2 className="font-bold dark:text-gray-200">最近7天访问量</h2>
          </div>
          <SimpleBarChart data={analytics.daily} labelKey="date" valueKey="views" color="bg-primary" />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
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
                    <span className="text-sm dark:text-gray-200 truncate max-w-[200px]">{p.title}</span>
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

      {analytics.topReferrers?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <h2 className="font-bold mb-4 dark:text-gray-200">流量来源 TOP 10</h2>
          <SimpleBarChart data={analytics.topReferrers} labelKey="referrer" valueKey="count" color="bg-green-500" />
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={18} className="text-primary" />
          <h2 className="font-bold dark:text-gray-200">用户反馈 ({feedbacks.length})</h2>
        </div>
        {feedbacks.length === 0 ? (
          <p className="text-gray-500 text-sm">暂无反馈</p>
        ) : (
          <div className="space-y-3">
            {feedbacks.map(fb => (
              <div key={fb.id} className="p-4 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      fb.type === 'bug' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                      fb.type === 'praise' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                      fb.type === 'other' ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                    }`}>
                      {{ suggestion: '建议', bug: 'Bug', praise: '好评', other: '其他' }[fb.type] || fb.type}
                    </span>
                    <span className="text-sm font-medium dark:text-gray-200">
                      {fb.user_name || fb.name || '匿名用户'}
                    </span>
                    {fb.email && <span className="text-xs text-gray-500">{fb.email}</span>}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                    {new Date(fb.created_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{fb.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail size={18} className="text-primary" />
          <h2 className="font-bold dark:text-gray-200">邮件订阅者 ({subscribers.length})</h2>
        </div>
        {subscribers.length === 0 ? (
          <p className="text-gray-500 text-sm">暂无订阅者</p>
        ) : (
          <div className="space-y-2">
            {subscribers.map(s => (
              <div key={s.id || s.email} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm dark:text-gray-200">{s.email}</span>
                  {s.is_verified ? (
                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">已验证</span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">未验证</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{new Date(s.created_at).toLocaleDateString('zh-CN')}</span>
                  <button
                    onClick={() => handleDeleteSubscriber(s.email)}
                    className="text-gray-400 hover:text-red-500 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={18} className="text-primary" />
          <h2 className="font-bold dark:text-gray-200">用户管理 ({usersTotal})</h2>
        </div>
        {usersLoading ? (
          <LoadingSpinner />
        ) : adminUsers.length === 0 ? (
          <p className="text-gray-500 text-sm">暂无用户</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-2 px-2">用户名</th>
                  <th className="text-left py-2 px-2">邮箱</th>
                  <th className="text-left py-2 px-2">角色</th>
                  <th className="text-left py-2 px-2">注册日期</th>
                  <th className="text-right py-2 px-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map(u => (
                  <tr key={u.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                          {u.username?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="dark:text-gray-200">{u.username}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-gray-500 text-xs">{u.email}</td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        u.role === 'admin' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {u.role === 'admin' ? '管理员' : '用户'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-gray-500 text-xs">
                      {new Date(u.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        onClick={() => handleAdminDeleteUser(u.id)}
                        disabled={u.role === 'admin'}
                        className={`transition p-1 ${u.role === 'admin' ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-red-500'}`}
                        title={u.role === 'admin' ? '不能删除管理员' : '删除用户'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {usersTotal > 20 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                  disabled={usersPage === 1}
                  className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 flex items-center justify-center transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-gray-500 min-w-[4rem] text-center">
                  {usersPage} / {Math.ceil(usersTotal / 20)}
                </span>
                <button
                  onClick={() => setUsersPage(p => p + 1)}
                  disabled={usersPage >= Math.ceil(usersTotal / 20)}
                  className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 flex items-center justify-center transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={18} className="text-primary" />
          <h2 className="font-bold dark:text-gray-200">文章管理 ({postsTotal})</h2>
        </div>
        {postsLoading ? (
          <LoadingSpinner />
        ) : adminPosts.length === 0 ? (
          <p className="text-gray-500 text-sm">暂无文章</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-2 px-2">标题</th>
                  <th className="text-left py-2 px-2">作者</th>
                  <th className="text-left py-2 px-2">状态</th>
                  <th className="text-center py-2 px-2">精选</th>
                  <th className="text-left py-2 px-2">日期</th>
                  <th className="text-right py-2 px-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {adminPosts.map(post => (
                  <tr key={post.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-2 px-2 max-w-[250px] truncate">
                      <Link to={`/blog/${post.id}`} className="hover:text-primary dark:text-gray-200">{post.title}</Link>
                    </td>
                    <td className="py-2 px-2 dark:text-gray-300">{post.authorName || '未知'}</td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        post.status === 'published' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {post.status === 'published' ? '已发布' : '草稿'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        onClick={() => handleAdminToggleFeature(post.id)}
                        className={`transition p-1 rounded ${post.isPinned ? 'text-amber-500 hover:text-amber-600' : 'text-gray-300 hover:text-amber-400'}`}
                        title={post.isPinned ? '取消精选' : '设为精选'}
                      >
                        <Pin size={16} fill={post.isPinned ? 'currentColor' : 'none'} />
                      </button>
                    </td>
                    <td className="py-2 px-2 text-gray-500 text-xs">
                      {new Date(post.createdAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        onClick={() => handleAdminDeletePost(post.id)}
                        className="text-gray-400 hover:text-red-500 transition p-1"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {postsTotal > 20 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  onClick={() => setPostsPage(p => Math.max(1, p - 1))}
                  disabled={postsPage === 1}
                  className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 flex items-center justify-center transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-gray-500 min-w-[4rem] text-center">
                  {postsPage} / {Math.ceil(postsTotal / 20)}
                </span>
                <button
                  onClick={() => setPostsPage(p => p + 1)}
                  disabled={postsPage >= Math.ceil(postsTotal / 20)}
                  className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 flex items-center justify-center transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
