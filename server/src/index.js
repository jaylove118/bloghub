import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import swaggerUi from 'swagger-ui-express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pool from './config/db.js'
import authRoutes from './routes/auth.js'
import postRoutes from './routes/posts.js'
import commentRoutes from './routes/comments.js'
import userRoutes from './routes/users.js'
import uploadRoutes from './routes/upload.js'
import notificationRoutes from './routes/notifications.js'
import subscriberRoutes from './routes/subscribers.js'
import { authRequired } from './middleware/auth.js'
import swaggerDoc from './config/swagger.js'

dotenv.config({ path: new URL('../.env', import.meta.url) })

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set')
  process.exit(1)
}

const app = express()
const PORT = process.env.PORT || 3001
const __dirname = dirname(fileURLToPath(import.meta.url))

app.set('trust proxy', 1)

app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
    },
  } : false,
  hsts: process.env.NODE_ENV === 'production',
}))

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

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc))
app.get('/api/docs.json', (_req, res) => res.json(swaggerDoc))

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '请求过于频繁，请稍后再试' },
})

app.use('/api/auth/login', authLimiter)
app.use('/api/auth/register', authLimiter)

const commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '评论过于频繁，请稍后再试' },
})

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '重置请求过于频繁，请稍后再试' },
})

app.use('/api/auth/forgot-password', resetLimiter)
app.use('/api/comments', commentLimiter)

app.use('/api/auth', authRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/comments', commentRoutes)
app.use('/api/users', userRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/subscribers', subscriberRoutes)

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

app.get('/api/admin/analytics', authRequired, async (_req, res) => {
  try {
    const [daily] = await pool.query(
      "SELECT DATE(created_at) AS date, COUNT(*) AS views FROM analytics_views WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY date"
    )
    const [referrers] = await pool.query(
      "SELECT CASE WHEN referrer = '' OR referrer IS NULL THEN '直接访问' WHEN referrer LIKE '%google%' THEN 'Google' WHEN referrer LIKE '%baidu%' THEN '百度' WHEN referrer LIKE '%github%' THEN 'GitHub' ELSE referrer END AS referrer, COUNT(*) AS count FROM analytics_views GROUP BY referrer ORDER BY count DESC LIMIT 10"
    )
    res.json({ daily, topReferrers: referrers })
  } catch { res.json({ daily: [], topReferrers: [] }) }
})

app.get('/api/subscribers', authRequired, async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM subscribers ORDER BY created_at DESC')
    res.json({ subscribers: rows })
  } catch { res.json({ subscribers: [] }) }
})

app.get('/api/admin/stats', authRequired, async (_req, res) => {
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

if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '..', '..', 'dist')
  app.use(express.static(distPath))
  app.get('*', (_req, res) => { res.sendFile(join(distPath, 'index.html')) })
}

app.use((err, _req, res, _next) => {
  const status = err.status || 500
  const message = status === 500 ? '服务器内部错误' : err.message
  res.status(status).json({ message })
})

app.listen(PORT, () => {})
