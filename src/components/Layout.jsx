import { Outlet, Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { Home, FileText, User, Settings, LogOut, Plus, Search, Menu as MenuIcon, Sun, Moon, X } from 'lucide-react'
import { categoryMap, TAG_WHITELIST, POPULAR_TAGS } from '../utils/constants'
import { useTheme } from '../context/ThemeContext'
import { api } from '../context/api'
import NotificationBell from './NotificationBell'
import SubscribeForm from './SubscribeForm'

export default function Layout() {
  const { user, isAuthenticated, logout } = useAuth()
  const { dark, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [popularTags, setPopularTags] = useState([])
  const [tagsExpanded, setTagsExpanded] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    api.posts.getTags().then(setPopularTags).catch(() => {})
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const handleClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const currentTags = (searchParams.get('tags') || '').split(',').filter(Boolean)
  const currentCategory = searchParams.get('category') || ''

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

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const navLinkClass = (path) =>
    `nav-link flex items-center gap-1 transition-colors duration-200${
      isActive(path) ? ' active text-primary font-medium' : ' text-gray-600 dark:text-gray-400 hover:text-primary'
    }`

  const sidebarCategoryClass = (slug) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200${
      (currentCategory === slug || (!currentCategory && slug === 'all'))
        ? ' bg-primary/10 text-primary font-medium'
        : ' hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-primary'
    }`

  return (
    <div className="min-h-screen flex flex-col">
      <header className={`fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-b z-50 transition-shadow duration-300 ${
        scrolled
          ? 'shadow-sm border-gray-200 dark:border-gray-800'
          : 'border-transparent'
      }`}>
        <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label={sidebarOpen ? '关闭菜单' : '打开菜单'}
            >
              <MenuIcon size={24} />
            </button>
            <Link to="/" className="text-2xl font-bold text-primary">
              BlogHub
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <Link to="/" className={navLinkClass('/')}><Home size={18} />首页</Link>
            <Link to="/blogs" className={navLinkClass('/blogs')}><FileText size={18} />博客</Link>
            {isAuthenticated && (
              <Link to={`/profile/${user?.id}`} className={navLinkClass('/profile')}><User size={18} />我的主页</Link>
            )}
            <Link to="/about" className={navLinkClass('/about')}>关于</Link>
          </nav>

          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className="hidden sm:flex items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索文章..."
                  className="pl-10 pr-4 py-2 w-48 lg:w-64 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-full focus:outline-none focus:border-primary transition"
                />
              </div>
            </form>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={dark ? '切换亮色模式' : '切换暗色模式'}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {isAuthenticated ? (
              <>
                <NotificationBell />
                <Link
                  to="/editor"
                  className="hidden sm:flex items-center gap-1 px-4 py-2 bg-primary text-white rounded-full hover:bg-secondary transition-colors shadow-sm"
                >
                  <Plus size={18} />
                  写文章
                </Link>
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="w-10 h-10 rounded-full overflow-hidden border-2 border-transparent hover:border-primary transition-colors"
                  >
                    <img
                      src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username}`}
                      alt={user?.username}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = `<span class="w-full h-full flex items-center justify-center bg-primary text-white font-bold text-sm">${(user?.username || 'U')[0].toUpperCase()}</span>` }}
                    />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 animate-fade-in">
                      <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                        <p className="font-medium text-sm">{user?.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                      </div>
                      <div className="p-2">
                        <Link
                          to={`/profile/${user?.id}`}
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                        >
                          <User size={16} />我的主页
                        </Link>
                        <Link
                          to="/settings"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                        >
                          <Settings size={16} />设置
                        </Link>
                        {user?.role === 'admin' && (
                          <Link
                            to="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                          >
                            <FileText size={16} />管理后台
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm text-error"
                        >
                          <LogOut size={16} />退出登录
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-primary text-white rounded-full hover:bg-secondary transition-colors shadow-sm"
                >
                  注册
                </Link>
              </div>
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
          <div className="p-4 h-full overflow-y-auto">
            {/* Mobile close */}
            <div className="flex items-center justify-between mb-4 lg:hidden">
              <span className="font-bold text-primary">BlogHub</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Categories */}
            <div className="mb-5">
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">分类</h3>
              <div className="space-y-0.5">
                <Link
                  to="/blogs"
                  onClick={() => setSidebarOpen(false)}
                  className={sidebarCategoryClass('all')}
                >
                  <span className="text-lg">📚</span>
                  <span>全部文章</span>
                </Link>
                {Object.entries(categoryMap).map(([slug, cat]) => (
                  <Link
                    key={slug}
                    to={`/blogs?category=${slug}`}
                    onClick={() => setSidebarOpen(false)}
                    className={sidebarCategoryClass(slug)}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span>{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 pt-5 mb-5">
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">热门标签</h3>
              <div className="flex flex-wrap gap-1.5">
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
                          className={`px-2.5 py-1 rounded-full text-xs transition-all duration-200 ${
                            currentTags.includes(tag)
                              ? 'bg-primary text-white shadow-sm'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                      {merged.length > 15 && (
                        <button
                          onClick={() => setTagsExpanded(!tagsExpanded)}
                          className="px-2.5 py-1 rounded-full text-xs text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                        >
                          {tagsExpanded ? '收起 ▲' : `展开 (${merged.length - 15}+) ▼`}
                        </button>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Write CTA */}
            <div className="p-4 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl border border-primary/10 dark:border-primary/5">
              <h3 className="font-semibold mb-1 text-sm">开始写作</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">分享你的想法和经验</p>
              <Link
                to="/editor"
                onClick={() => setSidebarOpen(false)}
                className="block text-center px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-secondary transition-colors"
              >
                写文章
              </Link>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 min-h-screen">
          <Outlet />
        </main>
      </div>

      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold text-primary mb-2">BlogHub</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">全功能博客平台 — 分享想法，连接读者</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">快速链接</h4>
              <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                <div><Link to="/" className="hover:text-primary transition-colors">首页</Link></div>
                <div><Link to="/blogs" className="hover:text-primary transition-colors">博客</Link></div>
                <div><Link to="/about" className="hover:text-primary transition-colors">关于</Link></div>
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
