import { Router } from 'express'
import pool from '../config/db.js'
import { authRequired, adminRequired } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { AppError } from '../utils/errors.js'

const router = Router()

const commentValidation = validate({
  content: { required: true, min: 1, max: 2000 },
  postId: { required: true },
})

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

    // Notifications
    const [post] = await pool.query('SELECT author_id, title FROM posts WHERE id = ?', [postId])
    if (post.length > 0) {
      if (parentId) {
        // Reply notification
        const [parent] = await pool.query('SELECT user_id FROM comments WHERE id = ?', [parentId])
        if (parent.length > 0 && parent[0].user_id !== req.userId) {
          await pool.query(
            'INSERT INTO notifications (user_id, type, actor_id, post_id, comment_id, message) VALUES (?, ?, ?, ?, ?, ?)',
            [parent[0].user_id, 'reply', req.userId, Number(postId), result.insertId, '回复了你的评论']
          )
        }
      } else if (post[0].author_id !== req.userId) {
        // Comment notification to post author
        await pool.query(
          'INSERT INTO notifications (user_id, type, actor_id, post_id, comment_id, message) VALUES (?, ?, ?, ?, ?, ?)',
          [post[0].author_id, 'comment', req.userId, Number(postId), result.insertId, '评论了你的文章《' + post[0].title + '》']
        )
      }
    }

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
      throw new AppError(404, '评论不存在')
    }
    if (rows[0].user_id !== req.userId && req.userRole !== 'admin') {
      throw new AppError(403, '无权删除他人评论')
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

    const [rows] = await conn.query('SELECT likes, user_id, content FROM comments WHERE id = ? FOR UPDATE', [req.params.id])
    if (rows.length === 0) {
      await conn.rollback()
      throw new AppError(404, '评论不存在')
    }

    let likes = typeof rows[0].likes === 'string' ? JSON.parse(rows[0].likes) : (rows[0].likes || [])
    if (likes.includes(req.userId)) {
      likes = likes.filter(uid => uid !== req.userId)
    } else {
      likes.push(req.userId)
      // Like notification
      if (rows[0].user_id !== req.userId) {
        await conn.query(
          'INSERT INTO notifications (user_id, type, actor_id, comment_id, message) VALUES (?, ?, ?, ?, ?)',
          [rows[0].user_id, 'like', req.userId, Number(req.params.id), '赞了你的评论']
        )
      }
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
