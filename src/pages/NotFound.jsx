import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Home, FileText } from 'lucide-react'

export default function NotFound() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/blogs?search=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl mb-4">🔍</div>
        <h1 className="text-6xl font-extrabold text-gray-200 dark:text-gray-700 mb-4">404</h1>
        <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">页面未找到</p>
        <p className="text-gray-500 dark:text-gray-400 mb-8">你访问的页面不存在或已被移除</p>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索文章..."
              className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-xl focus:outline-none focus:border-primary transition"
            />
          </div>
        </form>

        <div className="flex items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full hover:bg-secondary transition shadow-sm"
          >
            <Home size={18} />
            返回首页
          </Link>
          <Link
            to="/blogs"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition"
          >
            <FileText size={18} />
            浏览文章
          </Link>
        </div>
      </div>
    </div>
  )
}
