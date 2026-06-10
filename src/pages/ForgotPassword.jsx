import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, ArrowLeft, CheckCircle, Eye, EyeOff } from 'lucide-react'

export default function ForgotPassword() {
  useEffect(() => { document.title = '找回密码 - BlogHub' }, [])
  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [codeSending, setCodeSending] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const sendCode = async () => {
    if (!email) { setError('请先输入邮箱'); return }
    setError('')
    setCodeSending(true)
    try {
      const res = await fetch('/api/auth/send-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown(prev => { if (prev <= 1) { clearInterval(timer); return 0 } return prev - 1 })
      }, 1000)
    } catch (err) {
      setError(err.message)
    } finally {
      setCodeSending(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!code) { setError('请输入验证码'); return }
    if (newPassword.length < 6) { setError('新密码至少需要6个字符'); return }
    if (newPassword !== confirmPassword) { setError('两次输入的密码不一致'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || '重置失败')
      setStep('success')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
          <h1 className="text-2xl font-bold dark:text-gray-100 mb-2">密码重置成功</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">现在可以使用新密码登录了</p>
          <Link to="/login" className="inline-block px-6 py-3 bg-primary text-white rounded-full hover:bg-secondary transition">
            去登录
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-primary mb-6">
          <ArrowLeft size={18} />
          返回登录
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold dark:text-gray-100 mb-2">找回密码</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {step === 'email' ? '输入注册邮箱，接收验证码' : '输入验证码并设置新密码'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-error text-sm">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">邮箱</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:border-primary transition"
                    placeholder="your@email.com"
                    maxLength={100}
                    disabled={step === 'reset'}
                  />
                </div>
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={countdown > 0 || codeSending}
                  className="px-4 py-3 bg-primary text-white text-sm font-medium rounded-xl hover:bg-secondary transition disabled:opacity-50 whitespace-nowrap"
                >
                  {codeSending ? '发送中...' : countdown > 0 ? `${countdown}s` : '发送验证码'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">验证码</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:border-primary transition"
                placeholder="请输入邮箱收到的6位验证码"
                maxLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">新密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:border-primary transition"
                  placeholder="至少6个字符"
                  minLength={6}
                  maxLength={128}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">确认新密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:border-primary transition"
                  placeholder="再次输入新密码"
                  maxLength={128}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-secondary transition disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                '重置密码'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
