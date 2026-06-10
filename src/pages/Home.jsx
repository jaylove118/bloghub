import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../context/api'
import { useAuth } from '../context/AuthContext'
import { Heart, MessageCircle, Eye, Clock, TrendingUp, Sparkles, Pin } from 'lucide-react'
import { categoryMap, formatDate } from '../utils/constants'
import LoadingSpinner from '../components/LoadingSpinner'
import CoverPlaceholder from '../components/CoverPlaceholder'
import { useSEO } from '../hooks/useSEO'

export default function Home() {
  const { isAuthenticated, isAdmin } = useAuth()
  const [posts, setPosts] = useState([])
  const [featuredPost, setFeaturedPost] = useState(null)
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
          const pinned = data.find(p => p.isPinned)
          setFeaturedPost(pinned || data[0])
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
      setFeaturedPost(prev => prev?.id === postId ? { ...prev, isPinned: newPinned } : prev)
    } catch {}
  }

  if (loading) {
    return <LoadingSpinner />
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

      {tab === 'latest' && featuredPost && (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-amber-500" size={20} />
            <h2 className="text-xl font-bold">精选文章</h2>
          </div>
          <Link
            to={`/blog/${featuredPost.id}`}
            className="block group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
          >
            <div className="md:flex">
              <div className="md:w-2/3">
                <div className="aspect-video md:aspect-auto md:h-full">
                  {featuredPost.coverImage ? (
                    <img
                      src={featuredPost.coverImage}
                      alt={featuredPost.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <CoverPlaceholder title={featuredPost.title} className="w-full h-full" />
                  )}
                </div>
              </div>
              <div className="md:w-1/3 p-6 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-3 py-1 rounded-full text-sm ${categoryMap[featuredPost.category]?.color || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                    {categoryMap[featuredPost.category]?.icon} {categoryMap[featuredPost.category]?.name}
                  </span>
                  {featuredPost.isPinned && (
                    <span className="px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center gap-0.5">
                      <Pin size={12} /> 精选
                    </span>
                  )}
                  <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Eye size={14} />
                    {featuredPost.viewCount || 0}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition">
                  {featuredPost.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                  {featuredPost.excerpt || featuredPost.content.replace(/[#*`]/g, '').slice(0, 150)}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {formatDate(featuredPost.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart size={14} className="text-red-500" />
                    {featuredPost.likes?.length || 0}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

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
                className="group bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
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
        <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl">
          <div className="text-3xl mb-3">✍️</div>
          <h3 className="font-bold mb-2">创作自由</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">支持 Markdown，随时随地记录灵感</p>
        </div>
        <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 rounded-xl">
          <div className="text-3xl mb-3">👥</div>
          <h3 className="font-bold mb-2">社区互动</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">点赞、评论、收藏，与读者互动</p>
        </div>
        <div className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/20 rounded-xl">
          <div className="text-3xl mb-3">🎨</div>
          <h3 className="font-bold mb-2">精美主题</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">响应式设计，适配所有设备</p>
        </div>
      </section>
    </div>
  )
}
