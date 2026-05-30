import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../context/api'
import { Clock, Heart, MessageCircle, Search, X, ChevronLeft, ChevronRight, BookOpen, Pin } from 'lucide-react'
import { categoryMap, formatDate, readingTime } from '../utils/constants'
import LoadingSpinner from '../components/LoadingSpinner'
import CoverPlaceholder from '../components/CoverPlaceholder'
import { useSEO } from '../hooks/useSEO'

export default function BlogList() {
  useSEO({ title: '博客文章 - BlogHub', description: '浏览所有博客文章，按分类、标签筛选你感兴趣的内容。' })
  const [searchParams, setSearchParams] = useSearchParams()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 })

  const category = searchParams.get('category') || ''
  const tagsStr = searchParams.get('tags') || ''
  const tags = tagsStr.split(',').filter(Boolean)
  const search = searchParams.get('search') || ''

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true)
      const filters = { page, limit: 12 }
      if (search) filters.search = search
      if (category) filters.category = category
      if (tags.length) filters.tags = tags.join(',')
      const result = await api.posts.getAll(filters)
      setPosts(result.posts)
      setPagination(result.pagination)
      setLoading(false)
    }
    fetchPosts()
  }, [search, category, tagsStr, page])

  useEffect(() => {
    setPage(1)
  }, [search, category, tagsStr])

  const handleSearch = (e) => {
    e.preventDefault()
    setSearchParams(prev => { const next = new URLSearchParams(prev); next.set('search', searchInput); return next })
  }

  const handleCategory = (slug) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (slug) next.set('category', slug)
      else next.delete('category')
      return next
    })
  }

  const handleTagToggle = (t) => {
    setSearchParams(prev => {
      const current = (prev.get('tags') || '').split(',').filter(Boolean)
      const next = new URLSearchParams(prev)
      if (current.includes(t)) {
        const filtered = current.filter(x => x !== t)
        if (filtered.length) next.set('tags', filtered.join(','))
        else next.delete('tags')
      } else {
        next.set('tags', [...current, t].join(','))
      }
      return next
    })
  }

  const handleTagRemove = (t) => {
    setSearchParams(prev => {
      const current = (prev.get('tags') || '').split(',').filter(Boolean)
      const next = new URLSearchParams(prev)
      const filtered = current.filter(x => x !== t)
      if (filtered.length) next.set('tags', filtered.join(','))
      else next.delete('tags')
      return next
    })
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearchParams(new URLSearchParams())
  }

  const hasFilters = !!(search || category || tags.length)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold dark:text-white">博客文章</h1>

        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜索文章..."
              className="pl-10 pr-4 py-2 w-full sm:w-64 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-full focus:outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-full hover:bg-secondary transition whitespace-nowrap"
          >
            搜索
          </button>
        </form>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => handleCategory('')}
          className={`px-4 py-2 rounded-full text-sm transition ${
            !category ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          全部
        </button>
        {Object.entries(categoryMap).map(([slug, cat]) => (
          <button
            key={slug}
            onClick={() => handleCategory(slug)}
            className={`px-4 py-2 rounded-full text-sm transition ${
              category === slug ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>

      {tags.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-gray-500">标签:</span>
          {tags.map(t => (
            <span key={t} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-1">
              #{t}
              <button onClick={() => handleTagRemove(t)} className="hover:text-red-500">
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}

      {hasFilters && (
        <button
          onClick={clearFilters}
          className="mb-6 text-sm text-gray-500 hover:text-primary flex items-center gap-1"
        >
          <X size={14} />
          清除筛选
        </button>
      )}

      {loading ? (
        <LoadingSpinner className="h-64" />
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl">
          <p className="text-gray-500 mb-4">没有找到相关文章</p>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-primary hover:underline"
            >
              清除筛选
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-gray-500 dark:text-gray-400 mb-4">共 {pagination.total} 篇文章</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
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
                    {post.tags?.slice(0, 2).map((t) => (
                      <button key={t} onClick={(e) => { e.preventDefault(); handleTagToggle(t) }} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600 hover:bg-primary/20 hover:text-primary transition">
                        #{t}
                      </button>
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
                        <BookOpen size={12} />
                        {readingTime(post.content)}分钟
                      </span>
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

          {pagination.total > pagination.limit && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50 transition disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-gray-600">
                第 {page} / {Math.ceil(pagination.total / pagination.limit)} 页
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(pagination.total / pagination.limit)}
                className="px-4 py-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50 transition disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
