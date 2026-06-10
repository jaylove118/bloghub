import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../context/api'
import { useAuth } from '../context/AuthContext'
import { Calendar, Link as LinkIcon, Heart, MessageCircle, Eye, Clock, Pin, Edit, Trash2 } from 'lucide-react'
import { formatFullDate } from '../utils/constants'
import LoadingSpinner from '../components/LoadingSpinner'
import { useSEO } from '../hooks/useSEO'

export default function Profile() {
  const { id } = useParams()
  const { user: currentUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  const isOwn = currentUser?.id === id
  const navigate = useNavigate()

  const handleProfilePin = async (e, postId) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const newPinned = await api.posts.profilePin(postId)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, isProfilePinned: newPinned } : p))
    } catch {}
  }

  const handleDeletePost = async (e, postId) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm('确定要删除这篇文章吗？此操作不可撤销。')) return
    try {
      await api.posts.delete(postId)
      setPosts(prev => prev.filter(p => p.id !== postId))
    } catch {}
  }

  useSEO({
    title: profile?.username ? profile.username + ' 的个人资料 - BlogHub' : 'BlogHub',
    description: profile?.bio || (profile?.username ? profile.username + ' 的博客个人主页' : ''),
  })

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const userData = await api.users.getById(id)
      setProfile(userData)
      const { posts: userPosts } = await api.posts.getAll({ authorId: id })
      setPosts(userPosts)
      setLoading(false)
    }
    fetchData()
  }, [id])

  if (loading) {
    return <LoadingSpinner />
  }

  if (!profile) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 dark:text-gray-400">用户不存在</p>
      </div>
    )
  }

  const totalLikes = posts.reduce((sum, p) => sum + (p.likes?.length || 0), 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary to-secondary"></div>
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-12 gap-4">
            <img
              src={profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
              alt={profile.username}
              className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 shadow-lg bg-white dark:bg-gray-700"
            />
            <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0">
              <h1 className="text-2xl font-bold dark:text-gray-100">{profile.username}</h1>
              {profile.email && <p className="text-gray-500 dark:text-gray-400">{profile.email}</p>}
            </div>
            {isOwn && (
              <Link
                to="/settings"
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:text-gray-200 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                编辑资料
              </Link>
            )}
          </div>

          {profile.bio && (
            <p className="mt-6 text-gray-600 dark:text-gray-300">{profile.bio}</p>
          )}

          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              加入于 {formatFullDate(profile.createdAt)}
            </span>
            {profile.github && (
              <a
                href={profile.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary"
              >
                <LinkIcon size={14} />
                GitHub
              </a>
            )}
          </div>

          <div className="flex gap-6 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{posts.length}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">文章</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{totalLikes}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">获赞</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-6 dark:text-gray-100">{profile?.username || '用户'} 的文章</h2>
        {posts.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl">
            <p className="text-gray-500 dark:text-gray-400">还没有发布文章</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 hover:shadow-md transition relative group"
              >
                <div className="flex gap-4">
                  {post.coverImage && (
                    <Link to={`/blog/${post.id}`}>
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                      />
                    </Link>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {post.isProfilePinned && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 flex items-center gap-0.5 flex-shrink-0">
                          <Pin size={10} /> 已置顶
                        </span>
                      )}
                      {post.isPinned && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center gap-0.5 flex-shrink-0">
                          <Pin size={10} /> 精选
                        </span>
                      )}
                      <Link to={`/blog/${post.id}`} className="font-bold hover:text-primary transition dark:text-gray-200 truncate">
                        {post.title}
                      </Link>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {post.excerpt || post.content.replace(/[#*`]/g, '').slice(0, 100)}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatFullDate(post.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye size={12} />
                        {post.viewCount || 0}
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
                {isOwn && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleProfilePin(e, post.id)}
                      className={`p-1.5 rounded transition ${post.isProfilePinned ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30'}`}
                      title={post.isProfilePinned ? '取消置顶' : '在个人主页置顶'}
                    >
                      <Pin size={14} fill={post.isProfilePinned ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate('/editor/' + post.id) }}
                      className="p-1.5 rounded text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      title="编辑文章"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={(e) => handleDeletePost(e, post.id)}
                      className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                      title="删除文章"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
