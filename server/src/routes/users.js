import { Router } from 'express'
import pool from '../config/db.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, avatar, bio, github, created_at FROM users'
    )
    res.json({ users })
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, avatar, bio, github, created_at FROM users WHERE id = ?',
      [req.params.id]
    )
    if (users.length === 0) {
      const err = new Error('用户不存在')
      err.status = 404
      throw err
    }
    res.json({ user: users[0] })
  } catch (err) {
    next(err)
  }
})

export default router
