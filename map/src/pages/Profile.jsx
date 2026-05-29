import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../context/api'
import { useAuth } from '../context/AuthContext'
import { Calendar, Link as LinkIcon, Heart, MessageCircle, Eye, Clock } from 'lucide-react'
import { formatFullDate } from '../utils/constants'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Profile() {
  const { id } = useParams()
  const { user: currentUser } = useAuth()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  const isOwn = currentUser?.id === id

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
        <p className="text-gray-500">用户不存在</p>
      </div>
    )
  }

  const totalLikes = posts.reduce((sum, p) => sum + (p.likes?.length || 0), 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary to-secondary"></div>
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-12 gap-4">
            <img
              src={profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
              alt={profile.username}
              className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-white"
            />
            <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0">
              <h1 className="text-2xl font-bold">{profile.username}</h1>
              <p className="text-gray-500">{profile.email}</p>
            </div>
            {isOwn && (
              <Link
                to="/settings"
                className="px-4 py-2 border border-gray-300 rounded-full hover:bg-gray-50 transition"
              >
                编辑资料
              </Link>
            )}
          </div>

          {profile.bio && (
            <p className="mt-6 text-gray-600">{profile.bio}</p>
          )}

          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-500">
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

          <div className="flex gap-6 mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{posts.length}</div>
              <div className="text-sm text-gray-500">文章</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{totalLikes}</div>
              <div className="text-sm text-gray-500">获赞</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-6">他的文章</h2>
        {posts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl">
            <p className="text-gray-500">还没有发布文章</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.id}`}
                className="block bg-white rounded-xl p-4 hover:shadow-md transition"
              >
                <div className="flex gap-4">
                  {post.coverImage && (
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold hover:text-primary transition">{post.title}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {post.excerpt || post.content.replace(/[#*`]/g, '').slice(0, 100)}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
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
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
