import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Heart, MessageCircle, Reply, UserPlus } from 'lucide-react'
import { api } from '../context/api'
import { useAuth } from '../context/AuthContext'

const iconMap = {
  like: <Heart size={14} className="text-red-500" />,
  comment: <MessageCircle size={14} className="text-blue-500" />,
  reply: <Reply size={14} className="text-green-500" />,
  follow: <UserPlus size={14} className="text-purple-500" />,
}

export default function NotificationBell() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.notifications.getAll()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch {}
  }, [])

  useEffect(() => {
    if (user) {
      fetchNotifications()
      const t = setInterval(fetchNotifications, 30000)
      return () => clearInterval(t)
    }
  }, [user, fetchNotifications])

  const handleMarkAll = async () => {
    await api.notifications.markAllRead()
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
  }

  const handleMarkOne = async (e, id) => {
    e.stopPropagation()
    await api.notifications.markRead(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n))
    setUnreadCount(c => Math.max(0, c - 1))
  }

  if (!user) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-sm dark:text-gray-200">通知</h3>
              {unreadCount > 0 && (
                <button onClick={handleMarkAll} className="text-xs text-primary hover:underline">
                  全部已读
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">暂无通知</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-start gap-3 ${
                    !n.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="mt-0.5">{iconMap[n.type] || <Bell size={14} />}</div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={n.post_id ? `/blog/${n.post_id}` : '#'}
                      onClick={() => { setOpen(false); if (!n.is_read) handleMarkOne({ stopPropagation: () => {} }, n.id) }}
                      className="text-sm dark:text-gray-200"
                    >
                      <span className="font-medium">{n.actor_name}</span>{' '}
                      {n.message}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(n.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={(e) => handleMarkOne(e, n.id)}
                      className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2"
                      title="标记已读"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
