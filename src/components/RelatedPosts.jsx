import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../context/api'
import { Clock, Heart } from 'lucide-react'
import { formatDate } from '../utils/constants'

export default function RelatedPosts({ postId, category, tags, currentPostId }) {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    api.posts.getAll({ category, limit: 4 }).then(({ posts: data }) => {
      setPosts(data.filter((p) => p.id !== Number(currentPostId)).slice(0, 3))
    }).catch(() => {})
  }, [category, currentPostId])

  if (posts.length === 0) return null

  return (
    <section className="mt-8">
      <h3 className="text-lg font-bold mb-4 dark:text-gray-200">相关文章</h3>
      <div className="grid sm:grid-cols-3 gap-4">
        {posts.map((post) => (
          <Link
            key={post.id}
            to={`/blog/${post.id}`}
            className="block bg-white dark:bg-gray-800 rounded-xl p-4 hover:shadow-md transition border border-gray-100 dark:border-gray-700"
          >
            <h4 className="font-medium text-sm mb-2 line-clamp-2 hover:text-primary transition dark:text-gray-200">
              {post.title}
            </h4>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatDate(post.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <Heart size={12} />
                {post.likes?.length || 0}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
