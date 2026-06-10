import { Router } from 'express'
import pool from '../config/db.js'
import { validate } from '../middleware/validate.js'
import { authRequired } from '../middleware/auth.js'
import { sendSubscribeConfirmation } from '../utils/email.js'

const router = Router()

router.post('/subscribe', validate({ email: { required: true, max: 100 } }), async (req, res, next) => {
  try {
    const { email } = req.body
    await pool.query(
      'INSERT INTO subscribers (email, is_verified) VALUES (?, 1) ON DUPLICATE KEY UPDATE is_verified = 1',
      [email]
    )
    sendSubscribeConfirmation(email).catch(() => {})
    res.json({ message: '订阅成功！新文章发布时会通知你' })
  } catch (err) {
    next(err)
  }
})

router.get('/status', authRequired, async (req, res, next) => {
  try {
    const [users] = await pool.query('SELECT email FROM users WHERE id = ?', [req.userId])
    if (users.length === 0) return res.json({ subscribed: false })
    const [rows] = await pool.query('SELECT id FROM subscribers WHERE email = ?', [users[0].email])
    res.json({ subscribed: rows.length > 0, email: users[0].email })
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
