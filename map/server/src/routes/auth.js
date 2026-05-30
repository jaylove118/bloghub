import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../config/db.js'
import { authRequired } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { AppError } from '../utils/errors.js'

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
      throw AppError(400, '该邮箱已被注册')
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password, avatar) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, avatar || '']
    )

    const userId = result.insertId
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' })

    const [users] = await pool.query(
      'SELECT id, username, email, avatar, bio, github, created_at FROM users WHERE id = ?',
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
      throw AppError(401, '邮箱或密码错误')
    }

    const user = users[0]
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      throw AppError(401, '邮箱或密码错误')
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
      throw AppError(404, '用户不存在')
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
    await pool.query(
      'UPDATE users SET username = ?, bio = ?, avatar = ?, github = ? WHERE id = ?',
      [username || '', bio || '', avatar || '', github || '', req.userId]
    )
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
      throw AppError(400, '请填写旧密码和新密码')
    }
    if (newPassword.length < 6) {
      throw AppError(400, '新密码至少需要6个字符')
    }
    if (newPassword.length > 128) {
      throw AppError(400, '新密码不能超过128个字符')
    }

    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.userId])
    if (users.length === 0) {
      throw AppError(404, '用户不存在')
    }

    const valid = await bcrypt.compare(oldPassword, users[0].password)
    if (!valid) {
      throw AppError(400, '旧密码不正确')
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
    const { email, username } = req.body

    if (!email || !username) {
      throw AppError(400, '请填写邮箱和用户名')
    }

    const [users] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND username = ?',
      [email, username]
    )
    if (users.length === 0) {
      throw AppError(404, '邮箱与用户名不匹配')
    }

    if (!req.body.newPassword || req.body.newPassword.length < 6) {
      throw AppError(400, '新密码至少需要6个字符')
    }

    const hashed = await bcrypt.hash(req.body.newPassword, 10)
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, users[0].id])

    res.json({ success: true, message: '密码重置成功' })
  } catch (err) {
    next(err)
  }
})

export default router
