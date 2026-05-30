import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../context/api'
import { useAuth } from '../context/AuthContext'
import { Heart, MessageCircle, Eye, Clock, Edit, Trash2, ArrowLeft, Bookmark, BookOpen, Pin } from 'lucide-react'
import { parseMarkdown } from '../lib/index'
import { categoryMap, formatFullDate, readingTime } from '../utils/constants'
import LoadingSpinner from '../components/LoadingSpinner'

export default function BlogDetail() {
  const { id } = useParams()
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [author, setAuthor] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [liking, setLiking] = useState(false)
  const [commentLoading, setCommentLoading] = useState(false)

  const isAuthor = user?.id === post?.authorId

  useEffect(() => {
    if (post?.title) document.title = post.title + ' - BlogHub'
  }, [post])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const postData = await api.posts.getById(id)
      setPost(postData)
      if (postData?.authorId) {
        const authorData = await api.users.getById(postData.authorId)
        setAuthor(authorData)
      }
      if (postData?.id) {
        const commentsData = await api.comments.getByPostId(postData.id)
        setComments(commentsData)
      }
      setLoading(false)
    }
    fetchData()
  }, [id])

  const handleLike = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    setLiking(true)
    try {
      const newLikes = await api.posts.like(id)
      setPost({ ...post, likes: newLikes })
    } finally {
      setLiking(false)
    }
  }

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    try {
      const newFavorites = await api.posts.favorite(id)
      setPost({ ...post, favorites: newFavorites })
    } catch (error) {
      console.error(error)
    }
  }

  const handlePin = async () => {
    try {
      const newPinned = await api.posts.pin(id)
      setPost({ ...post, isPinned: newPinned })
    } catch (error) {
      console.error(error)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('确定要删除这篇文章吗？')) return
    try {
      await api.posts.delete(id)
      navigate('/blogs')
    } catch (error) {
      console.error(error)
    }
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (!newComment.trim()) return
    setCommentLoading(true)
    try {
      const comment = await api.comments.create({
        postId: id,
        content: newComment.trim(),
        parentId: null
      })
      setComments([...comments, comment])
      setNewComment('')
    } finally {
      setCommentLoading(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('确定要删除这条评论吗？')) return
    try {
      await api.comments.delete(commentId)
      setComments(comments.filter(c => c.id !== commentId && c.parentId !== commentId))
    } catch (error) {
      console.error(error)
    }
  }

  const handleReply = async (parentId, content) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (!content.trim()) return
    try {
      const reply = await api.comments.create({
        postId: id,
        content: content.trim(),
        parentId: parentId,
      })
      setComments([...comments, reply])
    } catch (error) {
      console.error(error)
    }
  }

  const handleCommentLike = async (commentId) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    try {
      const newLikes = await api.comments.like(commentId)
      setComments(comments.map(c => c.id === commentId ? { ...c, likes: newLikes } : c))
    } catch (error) {
      console.error(error)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  const isLiked = user && post?.likes?.includes(user.id)
  const isFavorited = user && post?.favorites?.includes(user.id)

  if (!post) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 mb-4">文章不存在</p>
        <Link to="/blogs" className="text-primary hover:underline">返回列表</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/blogs" className="inline-flex items-center gap-1 text-gray-600 hover:text-primary mb-6">
        <ArrowLeft size={18} />
        返回列表
      </Link>

      <article className="bg-white rounded-2xl overflow-hidden">
        {post.coverImage && (
          <div className="aspect-video">
            <img
              src={post.coverImage}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-3 py-1 rounded-full text-sm ${categoryMap[post.category]?.color || 'bg-gray-100 text-gray-700'}`}>
              {categoryMap[post.category]?.icon} {categoryMap[post.category]?.name}
            </span>
            {post.isPinned && (
              <span className="px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700 flex items-center gap-1">
                <Pin size={12} /> 置顶
              </span>
            )}
            {post.tags?.map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded text-sm text-gray-600">
                #{tag}
              </span>
            ))}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-4">{post.title}</h1>

          <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <Link to={`/profile/${author?.id}`} className="flex items-center gap-2">
              <img
                src={author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${author?.username}`}
                alt={author?.username}
                className="w-10 h-10 rounded-full"
              />
              <span className="font-medium">{author?.username}</span>
            </Link>
            <span className="flex items-center gap-1 text-gray-500 text-sm">
              <Clock size={14} />
              {formatFullDate(post.createdAt)}
            </span>
            <span className="flex items-center gap-1 text-gray-500 text-sm">
              <Eye size={14} />
              {post.viewCount || 0} 阅读
            </span>
            <span className="flex items-center gap-1 text-gray-500 text-sm">
              <BookOpen size={14} />
              {readingTime(post.content)} 分钟
            </span>
          </div>

          <div className="prose max-w-none mb-8" dangerouslySetInnerHTML={{ __html: parseMarkdown(post.content) }} />

          <div className="flex items-center justify-between pt-6 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLike}
                disabled={liking}
                className={`flex items-center gap-1 px-4 py-2 rounded-full transition ${
                  isLiked ? 'bg-red-50 text-red-500' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
                {post.likes?.length || 0}
              </button>
              <button
                onClick={handleFavorite}
                className={`flex items-center gap-1 px-4 py-2 rounded-full transition ${
                  isFavorited ? 'bg-amber-50 text-amber-500' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <Bookmark size={18} fill={isFavorited ? 'currentColor' : 'none'} />
                {post.favorites?.length || 0}
              </button>
            </div>

            {isAuthor && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePin}
                  className={`flex items-center gap-1 px-4 py-2 rounded-full transition ${
                    post.isPinned ? 'bg-amber-50 text-amber-500' : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                  title={post.isPinned ? '取消置顶' : '置顶'}
                >
                  <Pin size={16} fill={post.isPinned ? 'currentColor' : 'none'} />
                  {post.isPinned ? '已置顶' : '置顶'}
                </button>
                <Link
                  to={`/editor/${id}`}
                  className="flex items-center gap-1 px-4 py-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"
                >
                  <Edit size={16} />
                  编辑
                </Link>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1 px-4 py-2 bg-red-50 text-red-500 rounded-full hover:bg-red-100 transition"
                >
                  <Trash2 size={16} />
                  删除
                </button>
              </div>
            )}
          </div>
        </div>
      </article>

      <section className="mt-8">
        <h2 className="text-xl font-bold mb-6">
          评论 ({comments.filter(c => !c.parentId).length})
        </h2>

        {isAuthenticated ? (
          <form onSubmit={handleComment} className="mb-8">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="写下你的评论..."
              className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:border-primary resize-none"
              rows={3}
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                disabled={commentLoading || !newComment.trim()}
                className="px-6 py-2 bg-primary text-white rounded-full hover:bg-secondary transition disabled:opacity-50"
              >
                {commentLoading ? '发送中...' : '发表评论'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-8 p-4 bg-gray-50 rounded-xl text-center">
            <p className="text-gray-500">
              <Link to="/login" className="text-primary hover:underline">登录</Link>
              后才能评论
            </p>
          </div>
        )}

        <div className="space-y-4">
          {comments.filter(c => !c.parentId).map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={comments.filter(c => c.parentId === comment.id)}
              onDelete={handleDeleteComment}
              onLike={handleCommentLike}
              onReply={handleReply}
              currentUser={user}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function CommentItem({ comment, replies, onDelete, onLike, currentUser, onReply }) {
  const [showReply, setShowReply] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const isLiked = currentUser && comment.likes?.includes(currentUser.id)

  return (
    <div className="bg-white rounded-xl p-4">
      <div className="flex gap-3">
        <img
          src={comment.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + comment.userId}
          alt=""
          className="w-10 h-10 rounded-full"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{comment.username || '用户'}</span>
            <span className="text-xs text-gray-500">
              {new Date(comment.createdAt).toLocaleDateString('zh-CN')}
            </span>
          </div>
          <p className="mt-1 text-gray-700">{comment.content}</p>
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => onLike(comment.id)}
              className={'flex items-center gap-1 text-sm ' + (isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500')}
            >
              <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
              {comment.likes?.length || 0}
            </button>
            <button
              onClick={() => setShowReply(!showReply)}
              className="text-sm text-gray-500 hover:text-primary"
            >
              回复
            </button>
            {currentUser?.id === comment.userId && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-sm text-gray-500 hover:text-red-500"
              >
                删除
              </button>
            )}
          </div>

          {showReply && (
            <div className="mt-3">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="写下你的回复..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary text-sm resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => {
                    onReply && onReply(comment.id, replyContent)
                    setReplyContent('')
                    setShowReply(false)
                  }}
                  disabled={!replyContent.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-secondary disabled:opacity-50"
                >
                  回复
                </button>
              </div>
            </div>
          )}

          {replies.length > 0 && (
            <div className="mt-4 space-y-3 pl-4 border-l-2 border-gray-100">
              {replies.map((reply) => (
                <div key={reply.id} className="flex gap-2">
                  <img
                    src={reply.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + reply.userId}
                    alt=""
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{reply.username || '用户'}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(reply.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700">{reply.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
