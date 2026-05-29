import { Router } from 'express'
import pool from '../config/db.js'
import { authRequired } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = Router()

const commentValidation = validate({
  content: { required: true, min: 1, max: 2000 },
  postId: { required: true },
})

function AppError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

function parseLikes(row) {
  if (!row) return row
  return {
    ...row,
    likes: typeof row.likes === 'string' ? JSON.parse(row.likes) : (row.likes || []),
  }
}

router.get('/post/:postId', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT c.*, u.username, u.avatar FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = ? ORDER BY c.created_at ASC',
      [req.params.postId]
    )
    res.json({ comments: rows.map(parseLikes) })
  } catch (err) {
    next(err)
  }
})

router.post('/', authRequired, commentValidation, async (req, res, next) => {
  try {
    const { content, postId, parentId } = req.body
    const [result] = await pool.query(
      'INSERT INTO comments (content, post_id, user_id, parent_id) VALUES (?, ?, ?, ?)',
      [content, postId, req.userId, parentId || null]
    )
    const [rows] = await pool.query(
      'SELECT c.*, u.username, u.avatar FROM comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?',
      [result.insertId]
    )
    res.status(201).json({ comment: parseLikes(rows[0]) })
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT user_id FROM comments WHERE id = ?', [req.params.id])
    if (rows.length === 0) {
      throw AppError(404, '评论不存在')
    }
    if (rows[0].user_id !== req.userId) {
      throw AppError(403, '无权删除他人评论')
    }
    await pool.query(
      'DELETE FROM comments WHERE id = ? OR parent_id = ?',
      [req.params.id, req.params.id]
    )
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

router.post('/:id/like', authRequired, async (req, res, next) => {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [rows] = await conn.query('SELECT likes FROM comments WHERE id = ? FOR UPDATE', [req.params.id])
    if (rows.length === 0) {
      await conn.rollback()
      throw AppError(404, '评论不存在')
    }

    let likes = typeof rows[0].likes === 'string' ? JSON.parse(rows[0].likes) : (rows[0].likes || [])
    if (likes.includes(req.userId)) {
      likes = likes.filter(uid => uid !== req.userId)
    } else {
      likes.push(req.userId)
    }

    await conn.query('UPDATE comments SET likes = ? WHERE id = ?', [JSON.stringify(likes), req.params.id])
    await conn.commit()
    res.json({ likes })
  } catch (err) {
    await conn.rollback()
    next(err)
  } finally {
    conn.release()
  }
})

export default router
