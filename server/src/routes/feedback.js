import { Router } from 'express'
import pool from '../config/db.js'
import { validate } from '../middleware/validate.js'

const router = Router()

router.post('/', validate({
  content: { required: true, max: 2000 },
  type: { max: 20 },
  name: { max: 100 },
  email: { max: 100 },
}), async (req, res, next) => {
  try {
    const { name, email, type, content } = req.body
    await pool.query(
      'INSERT INTO feedbacks (name, email, type, content, user_id) VALUES (?, ?, ?, ?, ?)',
      [name || '', email || '', type || 'suggestion', content, req.userId || null]
    )
    res.status(201).json({ message: '感谢你的反馈！' })
  } catch (err) {
    next(err)
  }
})

export default router
