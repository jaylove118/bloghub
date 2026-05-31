import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../context/api'
import { User, Mail, Lock, Save, ArrowLeft, Key } from 'lucide-react'
import { Link } from 'react-router-dom'
import { avatarTypes } from '../utils/constants'
import { handleError } from '../utils/errors'

export default function Settings() {
  useEffect(() => { document.title = '账户设置 - BlogHub' }, [])
  const { user, updateProfile } = useAuth()
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || '',
    avatar: user?.avatar?.includes('dicebear') ? '' : user?.avatar || '',
    avatarType: 'avataaars',
    github: user?.github || '',
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  const [pwData, setPwData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setSuccess(false)
    try {
      let avatar = formData.avatar
      if (!avatar && formData.avatarType) {
        avatar = `https://api.dicebear.com/7.x/${formData.avatarType}/svg?seed=${formData.username}`
      }
      await updateProfile({
        username: formData.username,
        bio: formData.bio,
        avatar,
        github: formData.github
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      handleError(error, setError)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPwError('')
    setPwSuccess(false)

    if (pwData.newPassword !== pwData.confirmPassword) {
      setPwError('两次输入的新密码不一致')
      return
    }
    if (pwData.newPassword.length < 6) {
      setPwError('新密码至少需要6个字符')
      return
    }

    setPwLoading(true)
    try {
      await api.auth.changePassword(pwData.oldPassword, pwData.newPassword)
      setPwData({ oldPassword: '', newPassword: '', confirmPassword: '' })
      setPwSuccess(true)
      setTimeout(() => setPwSuccess(false), 3000)
    } catch (err) {
      setPwError(err.message)
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-1 text-gray-600 hover:text-primary mb-6">
        <ArrowLeft size={18} />
        返回
      </Link>

      <h1 className="text-2xl font-bold mb-6">账户设置</h1>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-success">
          保存成功！
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                maxLength={50}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">邮箱不可更改</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">个人简介</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              maxLength={500}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary transition resize-none"
              placeholder="介绍一下你自己..."
            />
            <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/500</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">GitHub 链接</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">github.com/</span>
              <input
                type="text"
                value={formData.github}
                onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                maxLength={255}
                className="w-full pl-24 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary transition"
                placeholder="你的GitHub用户名"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">头像</label>
            <div className="flex items-center gap-4 mb-3">
              <img
                src={formData.avatar || `https://api.dicebear.com/7.x/${formData.avatarType}/svg?seed=${formData.username}`}
                alt="avatar preview"
                className="w-20 h-20 rounded-full bg-gray-100"
              />
              <input
                type="text"
                value={formData.avatar}
                onChange={(e) => setFormData({ ...formData, avatar: e.target.value, avatarType: '' })}
                maxLength={2000}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-primary transition"
                placeholder="或输入头像图片URL"
              />
            </div>
            <div className="grid grid-cols-8 gap-2">
              {avatarTypes.slice(0, 16).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, avatar: '', avatarType: type })}
                  className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition ${
                    formData.avatarType === type && !formData.avatar ? 'border-primary' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={`https://api.dicebear.com/7.x/${type}/svg?seed=${formData.username}`}
                    alt={type}
                    className="w-full h-full"
                  />
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-secondary transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={18} />
                保存更改
              </>
            )}
          </button>
        </form>
      </div>

      <h2 className="text-xl font-bold mb-4">修改密码</h2>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        {pwError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-error text-sm">
            {pwError}
          </div>
        )}
        {pwSuccess && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-success text-sm">
            密码修改成功！
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">旧密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                required
                value={pwData.oldPassword}
                onChange={(e) => setPwData({ ...pwData, oldPassword: e.target.value })}
                maxLength={128}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary transition"
                placeholder="输入当前密码"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">新密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                required
                value={pwData.newPassword}
                onChange={(e) => setPwData({ ...pwData, newPassword: e.target.value })}
                maxLength={128}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary transition"
                placeholder="至少6个字符"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">确认新密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                required
                value={pwData.confirmPassword}
                onChange={(e) => setPwData({ ...pwData, confirmPassword: e.target.value })}
                maxLength={128}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-primary transition"
                placeholder="再次输入新密码"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={pwLoading}
            className="w-full py-3 bg-gray-800 text-white font-semibold rounded-xl hover:bg-gray-900 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {pwLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Key size={18} />
                修改密码
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
