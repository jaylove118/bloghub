import { Router } from 'express'
import pool from '../config/db.js'
import { authRequired } from '../middleware/auth.js'
import { AppError } from '../utils/errors.js'

const router = Router()

router.get('/', authRequired, async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT n.*, u.username AS actor_name, u.avatar AS actor_avatar
       FROM notifications n JOIN users u ON n.actor_id = u.id
       WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 50`,
      [req.userId]
    )
    const [unread] = await pool.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.userId]
    )
    res.json({ notifications: rows, unreadCount: unread[0].count })
  } catch (err) {
    next(err)
  }
})

router.put('/:id/read', authRequired, async (req, res, next) => {
  try {
    const [result] = await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, req.userId]
    )
    if (result.affectedRows === 0) throw AppError(404, '通知不存在')
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

router.put('/read-all', authRequired, async (req, res, next) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.userId])
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
