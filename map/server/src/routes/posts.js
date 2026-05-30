import { Router } from 'express'
import pool from '../config/db.js'
import { authRequired } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { AppError } from '../utils/errors.js'

const router = Router()

const postValidation = validate({
  title: { required: true, max: 200 },
  content: { required: true, max: 100000 },
  category: { required: true, max: 20 },
  excerpt: { max: 500 },
  coverImage: { max: 2000 },
  status: { max: 10 },
})

function parseJsonFields(post) {
  return {
    ...post,
    tags: typeof post.tags === 'string' ? JSON.parse(post.tags) : (post.tags || []),
    likes: typeof post.likes === 'string' ? JSON.parse(post.likes) : (post.likes || []),
    favorites: typeof post.favorites === 'string' ? JSON.parse(post.favorites) : (post.favorites || []),
  }
}

router.get('/', async (req, res, next) => {
  try {
    const { category, tag, search, authorId, page, limit, status } = req.query
    const pageNum = Math.max(1, parseInt(page) || 1)
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20))
    const offset = (pageNum - 1) * limitNum

    let where = ' WHERE 1=1'
    const params = []

    if (category && category !== 'all') {
      where += ' AND p.category = ?'
      params.push(category)
    }
    if (authorId) {
      where += ' AND p.author_id = ?'
      params.push(Number(authorId))
    }
    if (search) {
      where += ' AND (p.title LIKE ? OR p.content LIKE ?)'
      params.push('%' + search + '%', '%' + search + '%')
    }
    if (tag) {
      where += ' AND JSON_CONTAINS(p.tags, ?)'
      params.push(JSON.stringify(tag))
    }
    if (status === 'draft') {
      where += ' AND p.status = \'draft\''
    } else {
      where += ' AND p.status = \'published\''
    }

    const [countResult] = await pool.query(
      'SELECT COUNT(*) AS total FROM posts p JOIN users u ON p.author_id = u.id' + where,
      params
    )
    const total = countResult[0].total

    const sql = 'SELECT p.*, u.username AS author_name, u.avatar AS author_avatar, (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count FROM posts p JOIN users u ON p.author_id = u.id' + where + ' ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT ? OFFSET ?'
    params.push(limitNum, offset)

    const [rows] = await pool.query(sql, params)
    const posts = rows.map(parseJsonFields)

    res.json({ posts, pagination: { page: pageNum, limit: limitNum, total } })
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const recentlyViewed = (() => {
      try {
        return req.cookies?.viewed_posts ? JSON.parse(req.cookies.viewed_posts) : []
      } catch {
        return []
      }
    })()
    if (!recentlyViewed.includes(Number(id))) {
      await pool.query('UPDATE posts SET view_count = view_count + 1 WHERE id = ?', [id])
      recentlyViewed.push(Number(id))
      res.cookie('viewed_posts', JSON.stringify(recentlyViewed.slice(-20)), {
        maxAge: 30 * 60 * 1000, httpOnly: true, sameSite: 'lax',
      })
    }

    const [rows] = await pool.query(
      'SELECT p.*, u.username AS author_name, u.avatar AS author_avatar FROM posts p JOIN users u ON p.author_id = u.id WHERE p.id = ?',
      [id]
    )

    if (rows.length === 0) {
      throw AppError(404, '文章不存在')
    }

    res.json({ post: parseJsonFields(rows[0]) })
  } catch (err) {
    next(err)
  }
})

router.post('/', authRequired, postValidation, async (req, res, next) => {
  try {
    const { title, content, excerpt, category, coverImage, tags, status } = req.body

    const [result] = await pool.query(
      'INSERT INTO posts (title, content, excerpt, category, cover_image, tags, author_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, content, excerpt || '', category, coverImage || '', JSON.stringify(tags || []), req.userId, status === 'draft' ? 'draft' : 'published']
    )

    const [rows] = await pool.query(
      'SELECT p.*, u.username AS author_name, u.avatar AS author_avatar FROM posts p JOIN users u ON p.author_id = u.id WHERE p.id = ?',
      [result.insertId]
    )

    res.status(201).json({ post: parseJsonFields(rows[0]) })
  } catch (err) {
    next(err)
  }
})

router.put('/:id', authRequired, postValidation, async (req, res, next) => {
  try {
    const { id } = req.params
    const { title, content, excerpt, category, coverImage, tags, status } = req.body

    const [existing] = await pool.query('SELECT * FROM posts WHERE id = ?', [id])
    if (existing.length === 0) {
      throw AppError(404, '文章不存在')
    }
    if (existing[0].author_id !== req.userId) {
      throw AppError(403, '无权修改他人文章')
    }

    const newStatus = status === 'draft' ? 'draft' : 'published'
    await pool.query(
      'UPDATE posts SET title=?, content=?, excerpt=?, category=?, cover_image=?, tags=?, status=? WHERE id=?',
      [title, content, excerpt || '', category, coverImage || '', JSON.stringify(tags || []), newStatus, id]
    )

    const [rows] = await pool.query(
      'SELECT p.*, u.username AS author_name, u.avatar AS author_avatar FROM posts p JOIN users u ON p.author_id = u.id WHERE p.id = ?',
      [id]
    )

    res.json({ post: parseJsonFields(rows[0]) })
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', authRequired, async (req, res, next) => {
  try {
    const { id } = req.params
    const [existing] = await pool.query('SELECT * FROM posts WHERE id = ?', [id])
    if (existing.length === 0) {
      throw AppError(404, '文章不存在')
    }
    if (existing[0].author_id !== req.userId) {
      throw AppError(403, '无权删除他人文章')
    }
    await pool.query('DELETE FROM posts WHERE id = ?', [id])
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

router.post('/:id/like', authRequired, async (req, res, next) => {
  const conn = await pool.getConnection()
  try {
    const { id } = req.params
    await conn.beginTransaction()

    const [rows] = await conn.query('SELECT likes FROM posts WHERE id = ? FOR UPDATE', [id])
    if (rows.length === 0) {
      await conn.rollback()
      throw AppError(404, '文章不存在')
    }

    let likes = typeof rows[0].likes === 'string' ? JSON.parse(rows[0].likes) : (rows[0].likes || [])
    if (likes.includes(req.userId)) {
      likes = likes.filter(uid => uid !== req.userId)
    } else {
      likes.push(req.userId)
    }

    await conn.query('UPDATE posts SET likes = ? WHERE id = ?', [JSON.stringify(likes), id])
    await conn.commit()
    res.json({ likes })
  } catch (err) {
    await conn.rollback()
    next(err)
  } finally {
    conn.release()
  }
})

router.post('/:id/favorite', authRequired, async (req, res, next) => {
  const conn = await pool.getConnection()
  try {
    const { id } = req.params
    await conn.beginTransaction()

    const [rows] = await conn.query('SELECT favorites FROM posts WHERE id = ? FOR UPDATE', [id])
    if (rows.length === 0) {
      await conn.rollback()
      throw AppError(404, '文章不存在')
    }

    let favorites = typeof rows[0].favorites === 'string' ? JSON.parse(rows[0].favorites) : (rows[0].favorites || [])
    if (favorites.includes(req.userId)) {
      favorites = favorites.filter(uid => uid !== req.userId)
    } else {
      favorites.push(req.userId)
    }

    await conn.query('UPDATE posts SET favorites = ? WHERE id = ?', [JSON.stringify(favorites), id])
    await conn.commit()
    res.json({ favorites })
  } catch (err) {
    await conn.rollback()
    next(err)
  } finally {
    conn.release()
  }
})

router.get('/tags/all', async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT tags FROM posts WHERE status = 'published'")
    const counts = {}
    rows.forEach(r => {
      let tags = r.tags
      if (typeof tags === 'string') { try { tags = JSON.parse(tags) } catch { tags = [] } }
      (tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1 })
    })
    const sorted = Object.entries(counts).map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count)
    res.json({ tags: sorted })
  } catch {
    res.json({ tags: [] })
  }
})

router.put('/:id/pin', authRequired, async (req, res, next) => {
  try {
    const { id } = req.params

    const [existing] = await pool.query('SELECT author_id, is_pinned FROM posts WHERE id = ?', [id])
    if (existing.length === 0) {
      throw AppError(404, '文章不存在')
    }
    if (existing[0].author_id !== req.userId) {
      throw AppError(403, '无权操作他人文章')
    }

    const newPinned = existing[0].is_pinned ? 0 : 1
    await pool.query('UPDATE posts SET is_pinned = ? WHERE id = ?', [newPinned, id])
    res.json({ isPinned: Boolean(newPinned) })
  } catch (err) {
    next(err)
  }
})

export default router
