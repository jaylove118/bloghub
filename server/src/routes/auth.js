import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import pool from '../config/db.js'
import { authRequired } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { AppError } from '../utils/errors.js'
import { sendVerificationEmail, sendPasswordResetEmail, sendVerificationCode } from '../utils/email.js'

const router = Router()

const registerValidation = validate({
  username: { required: true, max: 50 },
  email: { required: true, max: 100 },
  password: { required: true, min: 6, max: 128 },
})

// 发送邮箱验证码
router.post('/send-verify-code', async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email) throw new AppError(400, '请输入邮箱')

    // Check rate limit: 60 seconds
    const [recent] = await pool.query(
      'SELECT id FROM email_verifications WHERE email = ? AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND)',
      [email]
    )
    if (recent.length > 0) throw new AppError(429, '请60秒后再试')

    // Check for existing verified user
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND email_verified = 1', [email])
    if (existing.length > 0) throw new AppError(400, '该邮箱已被注册')

    const code = String(Math.floor(100000 + Math.random() * 900000))
    await pool.query(
      'INSERT INTO email_verifications (email, code, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
      [email, code]
    )

    await sendVerificationCode(email, code)

    res.json({ message: '验证码已发送' })
  } catch (err) {
    next(err)
  }
})

router.post('/register', registerValidation, async (req, res, next) => {
  try {
    const { username, email, password, avatar, verifyCode } = req.body

    // Verify code
    if (!verifyCode) throw new AppError(400, '请输入邮箱验证码')
    const [codes] = await pool.query(
      'SELECT id FROM email_verifications WHERE email = ? AND code = ? AND expires_at > NOW()',
      [email, verifyCode]
    )
    if (codes.length === 0) throw new AppError(400, '验证码错误或已过期')

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email])
    if (existing.length > 0) {
      throw new AppError(400, '该邮箱已被注册')
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password, avatar, email_verified) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, avatar || '', 1]
    )

    // Delete used verification code
    await pool.query('DELETE FROM email_verifications WHERE email = ?', [email])

    const userId = result.insertId

    // Auto-promote to admin if email is in ADMIN_EMAILS
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []
    let role = 'user'
    if (adminEmails.includes(email.toLowerCase())) {
      await pool.query('UPDATE users SET role = ? WHERE id = ?', ['admin', userId])
      role = 'admin'
    }

    const token = jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '7d' })

    const [users] = await pool.query(
      'SELECT id, username, email, avatar, bio, github, role, email_verified, created_at FROM users WHERE id = ?',
      [userId]
    )

    res.status(201).json({ user: users[0], token })
  } catch (err) {
    next(err)
  }
})

const loginValidation = validate({
  email: { required: true, max: 100 },
  password: { required: true, max: 128 },
})

router.post('/login', loginValidation, async (req, res, next) => {
  try {
    const { email, password } = req.body

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email])
    if (users.length === 0) {
      throw new AppError(401, '邮箱或密码错误')
    }

    const user = users[0]
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      throw new AppError(401, '邮箱或密码错误')
    }

    // Auto-promote admin emails on login
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []
    if (adminEmails.includes(user.email?.toLowerCase()) && user.role !== 'admin') {
      await pool.query('UPDATE users SET role = ? WHERE id = ?', ['admin', user.id])
      user.role = 'admin'
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' })
    const { password: _, ...safe } = user

    res.json({ user: safe, token })
  } catch (err) {
    next(err)
  }
})

router.get('/me', authRequired, async (req, res, next) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, email, avatar, bio, github, role, created_at FROM users WHERE id = ?',
      [req.userId]
    )
    if (users.length === 0) {
      throw new AppError(404, '用户不存在')
    }
    res.json({ user: users[0] })
  } catch (err) {
    next(err)
  }
})

const profileValidation = validate({
  username: { max: 50 },
  bio: { max: 500 },
  github: { max: 255 },
})

router.put('/profile', authRequired, profileValidation, async (req, res, next) => {
  try {
    const { username, bio, avatar, github } = req.body
    const fields = []
    const values = []
    for (const [key, val] of Object.entries({ username, bio, avatar, github })) {
      if (val !== undefined) {
        fields.push(`${key} = ?`)
        values.push(val)
      }
    }
    if (fields.length === 0) {
      throw new AppError(400, '没有提供要更新的字段')
    }
    values.push(req.userId)
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values)

    const [users] = await pool.query(
      'SELECT id, username, email, avatar, bio, github, role, created_at FROM users WHERE id = ?',
      [req.userId]
    )
    res.json({ user: users[0] })
  } catch (err) {
    next(err)
  }
})

router.put('/password', authRequired, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      throw new AppError(400, '请填写旧密码和新密码')
    }
    if (newPassword.length < 6) {
      throw new AppError(400, '新密码至少需要6个字符')
    }
    if (newPassword.length > 128) {
      throw new AppError(400, '新密码不能超过128个字符')
    }

    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.userId])
    if (users.length === 0) {
      throw new AppError(404, '用户不存在')
    }

    const valid = await bcrypt.compare(oldPassword, users[0].password)
    if (!valid) {
      throw new AppError(400, '旧密码不正确')
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.userId])

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// 发送重置密码验证码
router.post('/send-reset-code', async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email) throw new AppError(400, '请输入邮箱')

    // Check rate limit
    const [recent] = await pool.query(
      'SELECT id FROM email_verifications WHERE email = ? AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND)',
      [email]
    )
    if (recent.length > 0) throw new AppError(429, '请60秒后再试')

    // Check if email exists
    const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email])
    if (users.length === 0) throw new AppError(404, '该邮箱未注册')

    const code = String(Math.floor(100000 + Math.random() * 900000))
    await pool.query(
      'INSERT INTO email_verifications (email, code, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
      [email, code]
    )

    await sendVerificationCode(email, code)

    res.json({ message: '验证码已发送' })
  } catch (err) {
    next(err)
  }
})

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email, code, newPassword, token } = req.body

    // Token-based reset (from email link) - keep for backward compatibility
    if (token) {
      if (!newPassword || newPassword.length < 6) {
        throw new AppError(400, '新密码至少需要6个字符')
      }
      const [users] = await pool.query(
        'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()',
        [token]
      )
      if (users.length === 0) {
        throw new AppError(400, '重置链接已过期或无效')
      }
      const hashed = await bcrypt.hash(newPassword, 10)
      await pool.query('UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [hashed, users[0].id])
      return res.json({ success: true, message: '密码重置成功' })
    }

    // Code-based reset (new flow)
    if (code) {
      if (!email) throw new AppError(400, '请输入邮箱')
      if (!newPassword || newPassword.length < 6) {
        throw new AppError(400, '新密码至少需要6个字符')
      }

      const [codes] = await pool.query(
        'SELECT id FROM email_verifications WHERE email = ? AND code = ? AND expires_at > NOW()',
        [email, code]
      )
      if (codes.length === 0) throw new AppError(400, '验证码错误或已过期')

      const hashed = await bcrypt.hash(newPassword, 10)
      await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashed, email])
      await pool.query('DELETE FROM email_verifications WHERE email = ?', [email])

      return res.json({ success: true, message: '密码重置成功' })
    }

    throw new AppError(400, '请提供验证码')
  } catch (err) {
    next(err)
  }
})

// OAuth - GitHub
router.get('/github', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId) return res.status(500).json({ message: 'GitHub OAuth 未配置' })
  const redirectUri = (process.env.SITE_URL || 'http://localhost:5173') + '/api/auth/github/callback'
  res.redirect(`https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`)
})

router.get('/github/callback', async (req, res, next) => {
  try {
    const { code } = req.query
    if (!code) throw new AppError(400, '授权失败')

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    })
    const tokenData = await tokenRes.json()
    if (tokenData.error) throw new AppError(400, 'GitHub授权失败')

    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: 'Bearer ' + tokenData.access_token },
    })
    const ghUser = await userRes.json()

    // Find or create user
    const ghEmail = ghUser.email || ghUser.login + '@github.user'
    const [existing] = await pool.query('SELECT * FROM users WHERE github = ? OR email = ?', [ghUser.login, ghEmail])
    let userId
    let role = 'user'
    if (existing.length > 0) {
      userId = existing[0].id
      role = existing[0].role || 'user'
    } else {
      const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []
      role = adminEmails.includes(ghEmail.toLowerCase()) ? 'admin' : 'user'
      const [result] = await pool.query(
        'INSERT INTO users (username, email, password, avatar, github, role) VALUES (?, ?, ?, ?, ?, ?)',
        [ghUser.login, ghEmail, '', ghUser.avatar_url || '', ghUser.login, role]
      )
      userId = result.insertId
    }

    // Auto-promote on login if ADMIN_EMAILS matches
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []
    if (adminEmails.includes(ghEmail.toLowerCase()) && role !== 'admin') {
      await pool.query('UPDATE users SET role = ? WHERE id = ?', ['admin', userId])
      role = 'admin'
    }

    const token = jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '7d' })
    const siteUrl = process.env.SITE_URL || 'http://localhost:5173'
    res.cookie('oauth_token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000,
    })
    res.redirect(siteUrl + '/oauth-callback')
  } catch (err) {
    next(err)
  }
})

// OAuth - Google
router.get('/google', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) return res.status(500).json({ message: 'Google OAuth 未配置' })
  const redirectUri = (process.env.SITE_URL || 'http://localhost:5173') + '/api/auth/google/callback'
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile`)
})

router.get('/google/callback', async (req, res, next) => {
  try {
    const { code } = req.query
    if (!code) throw new AppError(400, '授权失败')

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: (process.env.SITE_URL || 'http://localhost:5173') + '/api/auth/google/callback',
        grant_type: 'authorization_code',
      }),
    })
    const tokenData = await tokenRes.json()
    if (tokenData.error) throw new AppError(400, 'Google授权失败')

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: 'Bearer ' + tokenData.access_token },
    })
    const gUser = await userRes.json()

    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [gUser.email])
    let userId
    let role = 'user'
    if (existing.length > 0) {
      userId = existing[0].id
      role = existing[0].role || 'user'
    } else {
      const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []
      role = adminEmails.includes(gUser.email.toLowerCase()) ? 'admin' : 'user'
      const [result] = await pool.query(
        'INSERT INTO users (username, email, password, avatar, role) VALUES (?, ?, ?, ?, ?)',
        [gUser.name || gUser.email.split('@')[0], gUser.email, '', gUser.picture || '', role]
      )
      userId = result.insertId
    }

    // Auto-promote on login if ADMIN_EMAILS matches
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []
    if (adminEmails.includes(gUser.email.toLowerCase()) && role !== 'admin') {
      await pool.query('UPDATE users SET role = ? WHERE id = ?', ['admin', userId])
      role = 'admin'
    }

    const token = jwt.sign({ userId, role }, process.env.JWT_SECRET, { expiresIn: '7d' })
    const siteUrl = process.env.SITE_URL || 'http://localhost:5173'
    res.cookie('oauth_token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000,
    })
    res.redirect(siteUrl + '/oauth-callback')
  } catch (err) {
    next(err)
  }
})

// Verify email
router.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query
    if (!token) return res.status(400).json({ message: '缺少验证token' })

    // Find user by token first
    const [users] = await pool.query('SELECT id FROM users WHERE verify_token = ?', [token])
    if (users.length === 0) return res.status(404).json({ message: '无效的验证链接' })

    const userId = users[0].id
    await pool.query(
      'UPDATE users SET email_verified = 1, verify_token = NULL WHERE id = ?',
      [userId]
    )

    // Auto-login
    const jwtToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' })
    const siteUrl = process.env.SITE_URL || 'http://localhost:5173'
    res.cookie('oauth_token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000,
    })
    res.redirect(siteUrl + '/oauth-callback')
  } catch (err) {
    next(err)
  }
})

export default router
