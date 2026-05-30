import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../context/api'
import { useAuth } from '../context/AuthContext'
import { Heart, MessageCircle, Eye, Clock, TrendingUp, Sparkles, Pin } from 'lucide-react'
import { categoryMap, formatDate } from '../utils/constants'
import LoadingSpinner from '../components/LoadingSpinner'
import CoverPlaceholder from '../components/CoverPlaceholder'

export default function Home() {
  const { isAuthenticated } = useAuth()
  const [posts, setPosts] = useState([])
  const [featuredPost, setFeaturedPost] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { document.title = 'BlogHub - 全功能博客平台' }, [])

  useEffect(() => {
    const fetchPosts = async () => {
      const { posts: data } = await api.posts.getAll()
      setPosts(data)
      if (data.length > 0) {
        setFeaturedPost(data[0])
      }
      setLoading(false)
    }
    fetchPosts()
  }, [])

  if (loading) {
    return <LoadingSpinner />
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
              className="px-6 py-3 bg-white text-primary font-semibold rounded-full hover:bg-gray-100 transition"
            >
              写文章
            </Link>
          </div>
        </div>
      )}

      {!isAuthenticated && (
        <div className="mb-8 p-8 bg-gradient-to-r from-primary/90 to-secondary rounded-2xl text-white text-center">
          <h2 className="text-3xl font-bold mb-3">开始你的博客之旅</h2>
          <p className="text-lg opacity-90 mb-6">加入我们，分享你的想法和经验</p>
          <div className="flex justify-center gap-4">
            <Link
              to="/register"
              className="px-6 py-3 bg-white text-primary font-semibold rounded-full hover:bg-gray-100 transition"
            >
              立即注册
            </Link>
            <Link
              to="/blogs"
              className="px-6 py-3 border-2 border-white text-white font-semibold rounded-full hover:bg-white/10 transition"
            >
              浏览文章
            </Link>
          </div>
        </div>
      )}

      {featuredPost && (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-amber-500" size={20} />
            <h2 className="text-xl font-bold">精选文章</h2>
          </div>
          <Link
            to={`/blog/${featuredPost.id}`}
            className="block group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
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
                  <span className={`px-3 py-1 rounded-full text-sm ${categoryMap[featuredPost.category]?.color || 'bg-gray-100 text-gray-700'}`}>
                    {categoryMap[featuredPost.category]?.icon} {categoryMap[featuredPost.category]?.name}
                  </span>
                  {featuredPost.isPinned && (
                    <span className="px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700 flex items-center gap-0.5">
                      <Pin size={12} /> 置顶
                    </span>
                  )}
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Eye size={14} />
                    {featuredPost.viewCount || 0}
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition">
                  {featuredPost.title}
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {featuredPost.excerpt || featuredPost.content.replace(/[#*`]/g, '').slice(0, 150)}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500">
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
          <div className="flex items-center gap-2">
            <TrendingUp className="text-primary" size={20} />
            <h2 className="text-xl font-bold">最新文章</h2>
          </div>
          <Link to="/blogs" className="text-primary hover:underline">
            查看全部 →
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl">
            <p className="text-gray-500 mb-4">还没有文章</p>
            <Link
              to="/editor"
              className="inline-block px-6 py-3 bg-primary text-white rounded-full hover:bg-secondary transition"
            >
              写第一篇文章
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.slice(0, 6).map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.id}`}
                className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
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
                    <span className={`px-2 py-0.5 rounded text-xs ${categoryMap[post.category]?.color || 'bg-gray-100 text-gray-700'}`}>
                      {categoryMap[post.category]?.name}
                    </span>
                    {post.isPinned && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700 flex items-center gap-0.5">
                        <Pin size={10} /> 置顶
                      </span>
                    )}
                    {post.tags?.slice(0, 2).map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="font-bold mb-2 group-hover:text-primary transition line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {post.excerpt || post.content.replace(/[#*`]/g, '').slice(0, 100)}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
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
        <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
          <div className="text-3xl mb-3">✍️</div>
          <h3 className="font-bold mb-2">创作自由</h3>
          <p className="text-sm text-gray-600">支持 Markdown，随时随地记录灵感</p>
        </div>
        <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
          <div className="text-3xl mb-3">👥</div>
          <h3 className="font-bold mb-2">社区互动</h3>
          <p className="text-sm text-gray-600">点赞、评论、收藏，与读者互动</p>
        </div>
        <div className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl">
          <div className="text-3xl mb-3">🎨</div>
          <h3 className="font-bold mb-2">精美主题</h3>
          <p className="text-sm text-gray-600">响应式设计，适配所有设备</p>
        </div>
      </section>
    </div>
  )
}
