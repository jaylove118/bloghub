import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import pool from '../config/db.js'
import { authRequired } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { AppError } from '../utils/errors.js'
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email.js'

const router = Router()

const registerValidation = validate({
  username: { required: true, max: 50 },
  email: { required: true, max: 100 },
  password: { required: true, min: 6, max: 128 },
})

router.post('/register', registerValidation, async (req, res, next) => {
  try {
    const { username, email, password, avatar } = req.body

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email])
    if (existing.length > 0) {
      throw new AppError(400, '该邮箱已被注册')
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const verifyToken = crypto.randomBytes(32).toString('hex')
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password, avatar, verify_token) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, avatar || '', verifyToken]
    )

    const userId = result.insertId

    // Send verification email
    const sent = await sendVerificationEmail(email, verifyToken)
    if (!sent) {
      await pool.query('DELETE FROM users WHERE id = ?', [userId])
      throw new AppError(500, '验证邮件发送失败，请稍后重试')
    }

    res.status(201).json({ message: '验证邮件已发送，请检查邮箱完成验证' })
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
    if (!user.email_verified) {
      throw new AppError(403, '请先验证邮箱后再登录')
    }
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      throw new AppError(401, '邮箱或密码错误')
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' })
    const { password: _, ...safe } = user

    res.json({ user: safe, token })
  } catch (err) {
    next(err)
  }
})

router.get('/me', authRequired, async (req, res, next) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, email, avatar, bio, github, created_at FROM users WHERE id = ?',
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
      'SELECT id, username, email, avatar, bio, github, created_at FROM users WHERE id = ?',
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

router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email, username, newPassword, token } = req.body

    // Token-based reset (from email link)
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

    // Step 1: Generate reset token and send email
    if (!email || !username) {
      throw new AppError(400, '请填写邮箱和用户名')
    }

    const [users] = await pool.query(
      'SELECT id, email FROM users WHERE email = ? AND username = ?',
      [email, username]
    )
    if (users.length === 0) {
      throw new AppError(404, '邮箱与用户名不匹配')
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    await pool.query(
      'UPDATE users SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?',
      [resetToken, users[0].id]
    )

    // Send reset email (non-blocking)
    sendPasswordResetEmail(users[0].email, resetToken).catch(() => {})

    res.json({ success: true, message: '重置链接已发送到邮箱' })
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
    const [existing] = await pool.query('SELECT * FROM users WHERE github = ? OR email = ?', [ghUser.login, ghUser.email || ghUser.login + '@github.user'])
    let userId
    if (existing.length > 0) {
      userId = existing[0].id
    } else {
      const [result] = await pool.query(
        'INSERT INTO users (username, email, password, avatar, github) VALUES (?, ?, ?, ?, ?)',
        [ghUser.login, ghUser.email || ghUser.login + '@github.user', '', ghUser.avatar_url || '', ghUser.login]
      )
      userId = result.insertId
    }

    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' })
    const siteUrl = process.env.SITE_URL || 'http://localhost:5173'
    res.cookie('oauth_token', token, {
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
    if (existing.length > 0) {
      userId = existing[0].id
    } else {
      const [result] = await pool.query(
        'INSERT INTO users (username, email, password, avatar) VALUES (?, ?, ?, ?)',
        [gUser.name || gUser.email.split('@')[0], gUser.email, '', gUser.picture || '']
      )
      userId = result.insertId
    }

    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' })
    const siteUrl = process.env.SITE_URL || 'http://localhost:5173'
    res.cookie('oauth_token', token, {
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
