import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../context/api'
import { useAuth } from '../context/AuthContext'
import { Heart, MessageCircle, Eye, Clock, TrendingUp, Sparkles, Pin, ChevronLeft, ChevronRight } from 'lucide-react'
import { categoryMap, formatDate } from '../utils/constants'
import Skeleton from '../components/Skeleton'
import CoverPlaceholder from '../components/CoverPlaceholder'
import { useSEO } from '../hooks/useSEO'

export default function Home() {
  const { isAuthenticated, isAdmin } = useAuth()
  const [posts, setPosts] = useState([])
  const [featuredPosts, setFeaturedPosts] = useState([])
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('latest')

  useSEO({ title: 'BlogHub - 全功能博客平台', description: '加入我们，分享你的想法和经验。支持 Markdown 写作、社区互动的全功能博客平台。' })

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setError(null)
        setLoading(true)
        const opts = { limit: 20 }
        if (tab === 'featured') opts.featured = true
        const { posts: data } = await api.posts.getAll(opts)
        setPosts(data)
        if (tab === 'latest' && data.length > 0) {
          const pinned = data.filter(p => p.isPinned)
          setFeaturedPosts(pinned)
          setFeaturedIndex(0)
        }
      } catch (err) {
        setError('加载失败，请稍后重试')
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [tab])

  const handleToggleFeature = async (e, postId) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const newPinned = await api.posts.pin(postId)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isPinned: newPinned } : p))
      setFeaturedPosts(prev => {
        if (newPinned) {
          const post = posts.find(p => p.id === postId)
          return post ? [...prev, { ...post, isPinned: true }] : prev
        }
        return prev.filter(p => p.id !== postId)
      })
    } catch {}
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 h-24 skeleton rounded-2xl" />
        <div className="h-8 w-48 skeleton mb-6" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="card" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="text-primary hover:underline">重试</button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {isAuthenticated && (
        <div className="mb-8 p-6 bg-gradient-to-r from-primary to-secondary rounded-2xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">欢迎回来！👋</h2>
              <p className="opacity-90">开始今天的创作吧</p>
            </div>
            <Link
              to="/editor"
              className="px-6 py-3 bg-white dark:bg-gray-800 text-primary font-semibold rounded-full hover:bg-gray-100 transition"
            >
              写文章
            </Link>
          </div>
        </div>
      )}

      {!isAuthenticated && (
        <div className="mb-8 p-8 bg-gradient-to-r from-primary/90 to-secondary rounded-2xl text-white text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">开始你的博客之旅</h2>
          <p className="text-base md:text-lg opacity-90 mb-6">加入我们，分享你的想法和经验</p>
          <div className="flex justify-center gap-4">
            <Link
              to="/register"
              className="px-6 py-3 bg-white dark:bg-gray-800 text-primary font-semibold rounded-full hover:bg-gray-100 transition"
            >
              立即注册
            </Link>
            <Link
              to="/blogs"
              className="px-6 py-3 border-2 border-white text-white font-semibold rounded-full hover:bg-white dark:bg-gray-800/10 transition"
            >
              浏览文章
            </Link>
          </div>
        </div>
      )}

      {tab === 'latest' && featuredPosts.length > 0 && (() => {
        const post = featuredPosts[featuredIndex]
        if (!post) return null
        return (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-amber-500" size={20} />
            <h2 className="text-xl font-bold">精选文章</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {featuredIndex + 1} / {featuredPosts.length}
            </span>
          </div>

          <div className="relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm">
            <Link
              to={`/blog/${post.id}`}
              className="block group md:flex"
            >
              <div className="md:w-2/3">
                <div className="aspect-video md:aspect-auto md:h-72">
                  {post.coverImage ? (
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <CoverPlaceholder title={post.title} className="w-full h-full" />
                  )}
                </div>
              </div>
              <div className="md:w-1/3 p-6 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-3 py-1 rounded-full text-sm ${categoryMap[post.category]?.color || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                    {categoryMap[post.category]?.icon} {categoryMap[post.category]?.name}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center gap-0.5">
                    <Pin size={12} /> 精选
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Eye size={14} />
                    {post.viewCount || 0}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition">
                  {post.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                  {post.excerpt || post.content.replace(/[#*`]/g, '').slice(0, 150)}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {formatDate(post.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart size={14} className="text-red-500" />
                    {post.likes?.length || 0}
                  </span>
                </div>
              </div>
            </Link>

            {featuredPosts.length > 1 && (
              <>
                <button
                  onClick={() => setFeaturedIndex(i => i > 0 ? i - 1 : featuredPosts.length - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur shadow-md hover:bg-white dark:hover:bg-gray-700 hover:shadow-lg flex items-center justify-center text-gray-700 dark:text-gray-300 transition-all"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={() => setFeaturedIndex(i => i < featuredPosts.length - 1 ? i + 1 : 0)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur shadow-md hover:bg-white dark:hover:bg-gray-700 hover:shadow-lg flex items-center justify-center text-gray-700 dark:text-gray-300 transition-all"
                >
                  <ChevronRight size={24} />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {featuredPosts.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setFeaturedIndex(i)}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        i === featuredIndex
                          ? 'bg-primary w-7'
                          : 'bg-gray-300/80 dark:bg-gray-600/80 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
        )
      })()}

      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-primary" size={20} />
              <h2 className="text-xl font-bold">{tab === 'featured' ? '精选文章' : '最新文章'}</h2>
            </div>
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
              <button
                onClick={() => setTab('latest')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  tab === 'latest' ? 'bg-white dark:bg-gray-600 text-primary shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setTab('featured')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-1 ${
                  tab === 'featured' ? 'bg-white dark:bg-gray-600 text-primary shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Sparkles size={14} /> 精选
              </button>
            </div>
          </div>
          <Link to="/blogs" className="text-primary hover:underline">
            查看全部 →
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl">
            <p className="text-gray-500 dark:text-gray-400 mb-4">还没有文章</p>
            <Link
              to="/editor"
              className="inline-block px-6 py-3 bg-primary text-white rounded-full hover:bg-secondary transition"
            >
              写第一篇文章
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.id}`}
                className="group bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm card-hover"
              >
                <div className="aspect-video overflow-hidden">
                  {post.coverImage ? (
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <CoverPlaceholder title={post.title} className="w-full h-full" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${categoryMap[post.category]?.color || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                      {categoryMap[post.category]?.name}
                    </span>
                    {post.isPinned && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center gap-0.5">
                        <Pin size={10} /> 精选
                      </span>
                    )}
                    {isAdmin && (
                      <button
                        onClick={(e) => handleToggleFeature(e, post.id)}
                        className={`p-1 rounded transition ${post.isPinned ? 'text-amber-500 hover:text-amber-600' : 'text-gray-300 hover:text-amber-400'}`}
                        title={post.isPinned ? '取消精选' : '设为精选'}
                      >
                        <Pin size={14} fill={post.isPinned ? 'currentColor' : 'none'} />
                      </button>
                    )}
                    {post.tags?.slice(0, 2).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600 dark:text-gray-400">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="font-bold mb-2 group-hover:text-primary transition line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                    {post.excerpt || post.content.replace(/[#*`]/g, '').slice(0, 100)}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDate(post.createdAt)}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Heart size={12} />
                        {post.likes?.length || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle size={12} />
                        {post.commentCount || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        {[
          { emoji: '✍️', icon: '📝', title: '创作自由', desc: '支持 Markdown，随时随地记录灵感', accent: 'border-primary/40' },
          { emoji: '💬', icon: '❤️', title: '社区互动', desc: '点赞、评论、收藏，与读者深度交流', accent: 'border-red-400/40' },
          { emoji: '🎨', icon: '✨', title: '精美主题', desc: '响应式设计 + 暗色模式，适配所有设备', accent: 'border-amber-400/40' },
        ].map(({ emoji, icon, title, desc, accent }) => (
          <div key={title} className={`group p-6 bg-white dark:bg-gray-800 rounded-xl border-l-3 ${accent} shadow-sm card-hover`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                {emoji}
              </div>
              <div className="text-lg opacity-60">{icon}</div>
            </div>
            <h3 className="font-semibold mb-1.5">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
