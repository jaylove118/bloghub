import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import swaggerUi from 'swagger-ui-express'
import rateLimit from 'express-rate-limit'
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

const swaggerDoc = {
  openapi: '3.0.0',
  info: { title: 'BlogHub API', version: '1.0.0', description: '全功能博客平台 API' },
  servers: [{ url: '/api' }],
  paths: {
    '/auth/register': { post: { tags: ['Auth'], summary: '注册', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { username: { type: 'string' }, email: { type: 'string' }, password: { type: 'string' } } } } } }, responses: { '201': { description: '注册成功' } } } },
    '/auth/login': { post: { tags: ['Auth'], summary: '登录', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } } } }, responses: { '200': { description: '登录成功' } } } },
    '/auth/me': { get: { tags: ['Auth'], summary: '获取当前用户', security: [{ bearer: [] }], responses: { '200': { description: '用户信息' } } } },
    '/auth/forgot-password': { post: { tags: ['Auth'], summary: '找回密码', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' }, username: { type: 'string' } } } } } }, responses: { '200': { description: '重置链接已发送' } } } },
    '/posts': {
      get: { tags: ['Posts'], summary: '获取文章列表', parameters: [{ name: 'category', in: 'query' }, { name: 'search', in: 'query' }, { name: 'tag', in: 'query' }, { name: 'page', in: 'query' }, { name: 'limit', in: 'query' }], responses: { '200': { description: '文章列表' } } },
      post: { tags: ['Posts'], summary: '创建文章', security: [{ bearer: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' }, category: { type: 'string' } } } } } }, responses: { '201': { description: '创建成功' } } },
    },
    '/posts/{id}': {
      get: { tags: ['Posts'], summary: '获取文章详情', parameters: [{ name: 'id', in: 'path', required: true }], responses: { '200': { description: '文章详情' } } },
      put: { tags: ['Posts'], summary: '更新文章', security: [{ bearer: [] }], parameters: [{ name: 'id', in: 'path', required: true }], responses: { '200': { description: '更新成功' } } },
      delete: { tags: ['Posts'], summary: '删除文章', security: [{ bearer: [] }], parameters: [{ name: 'id', in: 'path', required: true }], responses: { '200': { description: '删除成功' } } },
    },
    '/posts/{id}/like': { post: { tags: ['Posts'], summary: '点赞/取消点赞', security: [{ bearer: [] }], parameters: [{ name: 'id', in: 'path', required: true }], responses: { '200': { description: '操作成功' } } } },
    '/posts/{id}/favorite': { post: { tags: ['Posts'], summary: '收藏/取消收藏', security: [{ bearer: [] }], parameters: [{ name: 'id', in: 'path', required: true }], responses: { '200': { description: '操作成功' } } } },
    '/posts/{id}/revisions': { get: { tags: ['Posts'], summary: '获取文章历史版本', parameters: [{ name: 'id', in: 'path', required: true }], responses: { '200': { description: '历史版本列表' } } } },
    '/posts/{id}/restore/{revId}': { post: { tags: ['Posts'], summary: '恢复历史版本', security: [{ bearer: [] }], parameters: [{ name: 'id', in: 'path', required: true }, { name: 'revId', in: 'path', required: true }], responses: { '200': { description: '恢复成功' } } } },
    '/comments/post/{postId}': {
      get: { tags: ['Comments'], summary: '获取文章评论', parameters: [{ name: 'postId', in: 'path', required: true }], responses: { '200': { description: '评论列表' } } },
      post: { tags: ['Comments'], summary: '发表评论', security: [{ bearer: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { content: { type: 'string' }, postId: { type: 'integer' }, parentId: { type: 'integer' } } } } } }, responses: { '201': { description: '评论成功' } } },
    },
    '/notifications': { get: { tags: ['Notifications'], summary: '获取通知列表', security: [{ bearer: [] }], responses: { '200': { description: '通知列表' } } } },
    '/notifications/read-all': { put: { tags: ['Notifications'], summary: '全部标记已读', security: [{ bearer: [] }], responses: { '200': { description: '操作成功' } } } },
    '/subscribers/subscribe': { post: { tags: ['Subscribers'], summary: '邮件订阅', requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string' } } } } } }, responses: { '200': { description: '订阅成功' } } } },
    '/rss': { get: { tags: ['Other'], summary: 'RSS Feed', responses: { '200': { description: 'RSS XML' } } } },
    '/sitemap.txt': { get: { tags: ['Other'], summary: '站点地图', responses: { '200': { description: 'TXT sitemap' } } } },
    '/health': { get: { tags: ['Other'], summary: '健康检查', responses: { '200': { description: 'OK' } } } },
  },
  components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } },
}
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

app.get('/api/admin/analytics', async (_req, res) => {
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

app.get('/api/subscribers', async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM subscribers ORDER BY created_at DESC')
    res.json({ subscribers: rows })
  } catch { res.json({ subscribers: [] }) }
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
