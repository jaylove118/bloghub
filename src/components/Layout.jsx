import { Outlet, Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Home, FileText, User, Settings, LogOut, Plus, Search, Menu as MenuIcon, Sun, Moon } from 'lucide-react'
import { categoryMap, TAG_WHITELIST, POPULAR_TAGS } from '../utils/constants'
import { useTheme } from '../context/ThemeContext'
import { api } from '../context/api'
import NotificationBell from './NotificationBell'
import SubscribeForm from './SubscribeForm'

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth()
  const { dark, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [popularTags, setPopularTags] = useState([])
  const [tagsExpanded, setTagsExpanded] = useState(false)

  useEffect(() => {
    api.posts.getTags().then(setPopularTags).catch(() => {})
  }, [])

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
      <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-50">
        <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
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
            {isAuthenticated && (
              <Link to={`/profile/${user?.id}`} className="flex items-center gap-1 hover:text-primary transition">
                <User size={18} />
                我的主页
              </Link>
            )}
            <Link to="/about" className="hover:text-primary transition">关于</Link>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title={dark ? '切换亮色模式' : '切换暗色模式'}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </nav>

          <form onSubmit={handleSearch} className="hidden sm:flex items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索文章..."
                className="pl-10 pr-4 py-2 w-64 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-full focus:outline-none focus:border-primary transition"
              />
            </div>
          </form>

          <div className="flex items-center gap-3">
            {isAuthenticated && <NotificationBell />}
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
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all duration-200">
                    <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                      <p className="font-medium">{user?.username}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <Link
                        to={`/profile/${user?.id}`}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition"
                      >
                        <User size={16} />
                        我的主页
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition"
                      >
                        <Settings size={16} />
                        设置
                      </Link>
                      {user?.role === 'admin' && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition"
                        >
                          <FileText size={16} />
                          管理后台
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition text-error"
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
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-primary transition"
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
          fixed lg:static inset-y-16 left-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-40
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="p-4">
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">分类</h3>
              <div className="space-y-1">
                <Link
                  to="/blogs"
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  <span>📚</span>
                  <span>全部文章</span>
                </Link>
                {Object.entries(categoryMap).map(([slug, cat]) => (
                  <Link
                    key={slug}
                    to={`/blogs?category=${slug}`}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition"
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">热门标签</h3>
              <div className="flex flex-wrap gap-2">
                {(function () {
                  const dbValid = popularTags.map(t => t.tag).filter(t => TAG_WHITELIST.has(t))
                  const merged = [...new Set([...POPULAR_TAGS, ...dbValid])]
                  const visible = tagsExpanded ? merged : merged.slice(0, 15)
                  return (
                    <>
                      {visible.map(tag => (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          className={`px-3 py-1 rounded-full text-sm transition ${
                            currentTags.includes(tag) ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                      {merged.length > 15 && (
                        <button
                          onClick={() => setTagsExpanded(!tagsExpanded)}
                          className="px-3 py-1 rounded-full text-sm text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        >
                          {tagsExpanded ? '收起 ▲' : `展开更多 (${merged.length - 15}+) ▼`}
                        </button>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl">
              <h3 className="font-semibold mb-2">开始写作</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">分享你的想法和经验</p>
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

      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold text-primary mb-2">BlogHub</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">全功能博客平台 — 分享想法，连接读者</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">快速链接</h4>
              <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
                <div><Link to="/" className="hover:text-primary transition">首页</Link></div>
                <div><Link to="/blogs" className="hover:text-primary transition">博客</Link></div>
                <div><Link to="/about" className="hover:text-primary transition">关于</Link></div>
              </div>
            </div>
            <SubscribeForm variant="footer" />
          </div>
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} BlogHub. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
