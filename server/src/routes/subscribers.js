import { Router } from 'express'
import crypto from 'crypto'
import pool from '../config/db.js'
import { validate } from '../middleware/validate.js'

const router = Router()

router.post('/subscribe', validate({ email: { required: true, max: 100 } }), async (req, res, next) => {
  try {
    const { email } = req.body
    const token = crypto.randomBytes(32).toString('hex')
    await pool.query(
      'INSERT INTO subscribers (email, verify_token) VALUES (?, ?) ON DUPLICATE KEY UPDATE verify_token = ?',
      [email, token, token]
    )
    // In production, send verification email here
    res.json({ message: '订阅成功，请查看邮箱确认' })
  } catch (err) {
    next(err)
  }
})

router.get('/verify', async (req, res, next) => {
  try {
    const { token } = req.query
    if (!token) return res.status(400).json({ message: '缺少验证token' })
    const [result] = await pool.query(
      'UPDATE subscribers SET is_verified = 1, verify_token = NULL WHERE verify_token = ?',
      [token]
    )
    if (result.affectedRows === 0) return res.status(404).json({ message: '无效的验证链接' })
    res.json({ message: '邮箱验证成功' })
  } catch (err) {
    next(err)
  }
})

router.post('/unsubscribe', async (req, res, next) => {
  try {
    const { email } = req.body
    await pool.query('DELETE FROM subscribers WHERE email = ?', [email])
    res.json({ message: '已取消订阅' })
  } catch (err) {
    next(err)
  }
})

export default router
