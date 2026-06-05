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
  slug: { max: 200 },
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

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180) || 'post'
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
      where += ' AND MATCH(p.title, p.content) AGAINST(? IN BOOLEAN MODE)'
      params.push(search + '*')
    }
    if (tag) {
      where += ' AND JSON_CONTAINS(p.tags, ?)'
      params.push(JSON.stringify(tag))
    }
    if (status === 'draft') {
      where += " AND p.status = 'draft'"
    } else {
      where += " AND p.status = 'published' AND (p.scheduled_at IS NULL OR p.scheduled_at <= NOW())"
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

router.get('/:idOrSlug', async (req, res, next) => {
  try {
    const { idOrSlug } = req.params
    const isNumeric = /^\d+$/.test(idOrSlug)

    const recentlyViewed = (() => {
      try {
        return req.cookies?.viewed_posts ? JSON.parse(req.cookies.viewed_posts) : []
      } catch { return [] }
    })()

    const [rows] = await pool.query(
      'SELECT p.*, u.username AS author_name, u.avatar AS author_avatar FROM posts p JOIN users u ON p.author_id = u.id WHERE ' + (isNumeric ? 'p.id = ?' : 'p.slug = ?'),
      [isNumeric ? Number(idOrSlug) : idOrSlug]
    )

    if (rows.length === 0) {
      throw new AppError(404, '文章不存在')
    }

    const post = rows[0]
    if (!recentlyViewed.includes(Number(post.id))) {
      await pool.query('UPDATE posts SET view_count = view_count + 1 WHERE id = ?', [post.id])

      // Track detailed analytics
      try {
        await pool.query(
          'INSERT INTO analytics_views (post_id, viewer_ip, referrer, user_agent) VALUES (?, ?, ?, ?)',
          [post.id, req.ip || '', req.get('Referer') || '', req.get('User-Agent') || '']
        )
      } catch {}

      recentlyViewed.push(Number(post.id))
      res.cookie('viewed_posts', JSON.stringify(recentlyViewed.slice(-20)), {
        maxAge: 30 * 60 * 1000, httpOnly: true, sameSite: 'lax',
      })
    }

    res.json({ post: parseJsonFields(post) })
  } catch (err) {
    next(err)
  }
})

router.post('/', authRequired, postValidation, async (req, res, next) => {
  try {
    const { title, content, excerpt, category, coverImage, tags, status, scheduledAt, slug: customSlug } = req.body
    const slug = customSlug || generateSlug(title)

    const [result] = await pool.query(
      'INSERT INTO posts (title, slug, content, excerpt, category, cover_image, tags, author_id, status, scheduled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, slug, content, excerpt || '', category, coverImage || '', JSON.stringify(tags || []), req.userId, status === 'draft' ? 'draft' : 'published', scheduledAt || null]
    )

    // Update slug with ID suffix for uniqueness
    const finalSlug = slug + '-' + result.insertId
    await pool.query('UPDATE posts SET slug = ? WHERE id = ?', [finalSlug, result.insertId])

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
    const { title, content, excerpt, category, coverImage, tags, status, scheduledAt, slug: customSlug } = req.body

    const [existing] = await pool.query('SELECT * FROM posts WHERE id = ?', [id])
    if (existing.length === 0) {
      throw new AppError(404, '文章不存在')
    }
    if (existing[0].author_id !== req.userId) {
      throw new AppError(403, '无权修改他人文章')
    }

    // Save revision before update
    await pool.query(
      'INSERT INTO post_revisions (post_id, title, content, revised_by) VALUES (?, ?, ?, ?)',
      [id, existing[0].title, existing[0].content, req.userId]
    )

    // Keep only last 10 revisions
    await pool.query(
      'DELETE FROM post_revisions WHERE post_id = ? AND id NOT IN (SELECT id FROM (SELECT id FROM post_revisions WHERE post_id = ? ORDER BY created_at DESC LIMIT 10) AS tmp)',
      [id, id]
    )

    const newSlug = customSlug || generateSlug(title) + '-' + id
    const newStatus = status === 'draft' ? 'draft' : 'published'
    await pool.query(
      'UPDATE posts SET title=?, slug=?, content=?, excerpt=?, category=?, cover_image=?, tags=?, status=?, scheduled_at=? WHERE id=?',
      [title, newSlug, content, excerpt || '', category, coverImage || '', JSON.stringify(tags || []), newStatus, scheduledAt || null, id]
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
      throw new AppError(404, '文章不存在')
    }
    if (existing[0].author_id !== req.userId) {
      throw new AppError(403, '无权删除他人文章')
    }
    await pool.query('DELETE FROM posts WHERE id = ?', [id])
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// Revisions
router.get('/:id/revisions', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT r.*, u.username AS revised_by_name FROM post_revisions r JOIN users u ON r.revised_by = u.id WHERE r.post_id = ? ORDER BY r.created_at DESC LIMIT 20',
      [req.params.id]
    )
    res.json({ revisions: rows })
  } catch (err) {
    next(err)
  }
})

router.post('/:id/restore/:revId', authRequired, async (req, res, next) => {
  try {
    const { id, revId } = req.params
    const [existing] = await pool.query('SELECT * FROM posts WHERE id = ?', [id])
    if (existing.length === 0) throw new AppError(404, '文章不存在')
    if (existing[0].author_id !== req.userId) throw new AppError(403, '无权操作')

    const [revs] = await pool.query('SELECT * FROM post_revisions WHERE id = ? AND post_id = ?', [revId, id])
    if (revs.length === 0) throw new AppError(404, '版本不存在')

    // Save current as revision before restoring
    await pool.query(
      'INSERT INTO post_revisions (post_id, title, content, revised_by) VALUES (?, ?, ?, ?)',
      [id, existing[0].title, existing[0].content, req.userId]
    )

    const rev = revs[0]
    await pool.query('UPDATE posts SET title=?, content=? WHERE id=?', [rev.title, rev.content, id])
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

    const [rows] = await conn.query('SELECT likes, author_id, title FROM posts WHERE id = ? FOR UPDATE', [id])
    if (rows.length === 0) {
      await conn.rollback()
      throw new AppError(404, '文章不存在')
    }

    let likes = typeof rows[0].likes === 'string' ? JSON.parse(rows[0].likes) : (rows[0].likes || [])
    let added = false
    if (likes.includes(req.userId)) {
      likes = likes.filter(uid => uid !== req.userId)
    } else {
      likes.push(req.userId)
      added = true
    }

    await conn.query('UPDATE posts SET likes = ? WHERE id = ?', [JSON.stringify(likes), id])

    // Create notification for like
    if (added && rows[0].author_id !== req.userId) {
      await conn.query(
        'INSERT INTO notifications (user_id, type, actor_id, post_id, message) VALUES (?, ?, ?, ?, ?)',
        [rows[0].author_id, 'like', req.userId, Number(id), '赞了你的文章《' + rows[0].title + '》']
      )
    }

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
      throw new AppError(404, '文章不存在')
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
    if (existing.length === 0) throw new AppError(404, '文章不存在')
    if (existing[0].author_id !== req.userId) throw new AppError(403, '无权操作他人文章')

    const newPinned = existing[0].is_pinned ? 0 : 1
    await pool.query('UPDATE posts SET is_pinned = ? WHERE id = ?', [newPinned, id])
    res.json({ isPinned: Boolean(newPinned) })
  } catch (err) {
    next(err)
  }
})

export default router
