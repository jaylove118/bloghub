import { Outlet, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Home, FileText, User, Settings, LogOut, Plus, Search, Menu as MenuIcon } from 'lucide-react'
import { categoryMap } from '../utils/constants'

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const currentTags = (searchParams.get('tags') || '').split(',').filter(Boolean)

  const handleTagToggle = (tag) => {
    const next = new URLSearchParams(searchParams)
    if (currentTags.includes(tag)) {
      const f = currentTags.filter(t => t !== tag)
      if (f.length) next.set('tags', f.join(','))
      else next.delete('tags')
    } else {
      next.set('tags', [...currentTags, tag].join(','))
    }
    const qs = next.toString()
    navigate('/blogs' + (qs ? '?' + qs : ''))
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/blogs?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50">
        <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <MenuIcon size={24} />
            </button>
            <Link to="/" className="text-2xl font-bold text-primary">
              BlogHub
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="flex items-center gap-1 hover:text-primary transition">
              <Home size={18} />
              首页
            </Link>
            <Link to="/blogs" className="flex items-center gap-1 hover:text-primary transition">
              <FileText size={18} />
              博客
            </Link>
            <Link to="/about" className="hover:text-primary transition">关于</Link>
          </nav>

          <form onSubmit={handleSearch} className="hidden sm:flex items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索文章..."
                className="pl-10 pr-4 py-2 w-64 border border-gray-200 rounded-full focus:outline-none focus:border-primary transition"
              />
            </div>
          </form>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  to="/editor"
                  className="hidden sm:flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-full hover:bg-secondary transition"
                >
                  <Plus size={18} />
                  写文章
                </Link>
                <div className="relative group">
                  <button className="w-10 h-10 rounded-full overflow-hidden border-2 border-transparent hover:border-primary transition">
                    <img
                      src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                      alt={user?.username}
                      className="w-full h-full object-cover"
                    />
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200">
                    <div className="p-3 border-b border-gray-100">
                      <p className="font-medium">{user?.username}</p>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <Link
                        to={`/profile/${user?.id}`}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg transition"
                      >
                        <User size={16} />
                        个人资料
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg transition"
                      >
                        <Settings size={16} />
                        设置
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg transition text-error"
                      >
                        <LogOut size={16} />
                        退出登录
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 text-gray-600 hover:text-primary transition"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-primary text-white rounded-full hover:bg-secondary transition"
                >
                  注册
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        <aside className={`
          fixed lg:static inset-y-16 left-0 w-64 bg-white border-r border-gray-200 z-40
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-4">
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">分类</h3>
              <div className="space-y-1">
                <Link
                  to="/blogs"
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition"
                >
                  <span>📚</span>
                  <span>全部文章</span>
                </Link>
                {Object.entries(categoryMap).map(([slug, cat]) => (
                  <Link
                    key={slug}
                    to={`/blogs?category=${slug}`}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition"
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">热门标签</h3>
              <div className="flex flex-wrap gap-2">
                {['React', 'JavaScript', 'CSS', 'Node.js', 'Python'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-1 rounded-full text-sm transition ${
                      currentTags.includes(tag) ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl">
              <h3 className="font-semibold mb-2">开始写作</h3>
              <p className="text-sm text-gray-600 mb-3">分享你的想法和经验</p>
              <Link
                to="/editor"
                className="block text-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition"
              >
                写文章
              </Link>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
