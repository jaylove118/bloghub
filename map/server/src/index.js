import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pool from './config/db.js'
import authRoutes from './routes/auth.js'
import postRoutes from './routes/posts.js'
import commentRoutes from './routes/comments.js'
import userRoutes from './routes/users.js'
import uploadRoutes from './routes/upload.js'

dotenv.config({ path: new URL('../.env', import.meta.url) })

const app = express()
const PORT = process.env.PORT || 3001
const __dirname = dirname(fileURLToPath(import.meta.url))

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173']

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true)
    } else {
      cb(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())
app.use('/uploads', express.static(join(__dirname, '..', 'uploads')))

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '请求过于频繁，请稍后再试' },
})

app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)

app.use('/api/auth', authRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/users', userRoutes)
app.use('/api/upload', uploadRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

app.get('/api/rss', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, title, excerpt, content, created_at FROM posts WHERE status = 'published' ORDER BY created_at DESC LIMIT 20"
    )
    const items = rows.map(p => `
    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${process.env.SITE_URL || 'http://localhost:5173'}/blog/${p.id}</link>
      <description><![CDATA[${p.excerpt || p.content.replace(/[#*`]/g, '').slice(0, 200)}]]></description>
      <pubDate>${new Date(p.created_at).toUTCString()}</pubDate>
      <guid>${process.env.SITE_URL || 'http://localhost:5173'}/blog/${p.id}</guid>
    </item>`).join('')
    res.set('Content-Type', 'application/rss+xml; charset=utf-8')
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>BlogHub</title><link>${process.env.SITE_URL || 'http://localhost:5173'}</link>
  <description>全功能博客平台</description><language>zh-CN</language>${items}
</channel></rss>`)
  } catch { res.status(500).json({ message: 'RSS生成失败' }) }
})

app.get('/api/sitemap.txt', async (_req, res) => {
  try {
    const [posts] = await pool.query("SELECT id, updated_at FROM posts WHERE status = 'published' ORDER BY id")
    res.set('Content-Type', 'text/plain; charset=utf-8')
    const base = process.env.SITE_URL || 'http://localhost:5173'
    const urls = posts.map(p => `${base}/blog/${p.id}`).join('\n')
    res.send(`${base}\n${base}/blogs\n${base}/about\n${urls}`)
  } catch { res.status(500).json({ message: 'Sitemap生成失败' }) }
})

app.get('/api/admin/stats', async (_req, res) => {
  try {
    const [[{ totalPosts }]] = await pool.query("SELECT COUNT(*) AS totalPosts FROM posts WHERE status = 'published'")
    const [[{ totalUsers }]] = await pool.query("SELECT COUNT(*) AS totalUsers FROM users")
    const [[{ totalComments }]] = await pool.query("SELECT COUNT(*) AS totalComments FROM comments")
    const [[{ totalViews }]] = await pool.query("SELECT COALESCE(SUM(view_count), 0) AS totalViews FROM posts")
    const [topPosts] = await pool.query("SELECT id, title, view_count, (SELECT COUNT(*) FROM comments WHERE post_id = posts.id) AS comment_count FROM posts WHERE status = 'published' ORDER BY view_count DESC LIMIT 5")
    const [recentUsers] = await pool.query("SELECT id, username, email, created_at FROM users ORDER BY created_at DESC LIMIT 5")
    res.json({ totalPosts, totalUsers, totalComments, totalViews, topPosts, recentUsers })
  } catch (err) { res.status(500).json({ message: '统计获取失败' }) }
})

app.use((err, _req, res, _next) => {
  const status = err.status || 500
  const message = status === 500 ? '服务器内部错误' : err.message
  if (status === 500) {
    console.error('[Error]', err.message)
  }
  res.status(status).json({ message })
})

app.listen(PORT, () => {
  console.log(`BlogHub server running on http://localhost:${PORT}`)
})
