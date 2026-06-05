# BlogHub 全面修复实现计划

> **面向 AI 代理的工作者：** 使用 superpowers:subagent-driven-development 逐任务实现。步骤使用复选框（`- [ ]`）语法跟踪进度。

**目标：** 修复三方审计发现的所有 45 个问题（12 CRITICAL + 11 HIGH + 14 MEDIUM + 8 LOW），每批修完跑全量测试确保 74 个测试全绿。

**架构：** 分批修复——安全漏洞优先，然后是错误处理和配置，最后是质量改进。每批独立 commit。

**技术栈：** React 18 + Vite + TailwindCSS + Express + MySQL2

---

## 批次概览

| 批次 | 内容 | 文件数 | 测试 |
|------|------|--------|------|
| 1 | 安全漏洞 CRITICAL（后端） | ~6 | 32 后端测试 |
| 2 | 前端 CRITICAL | ~7 | 42 前端测试 |
| 3 | HIGH 后端 | ~4 | 32 后端测试 |
| 4 | HIGH 前端 | ~8 | 42 前端测试 |
| 5 | MEDIUM 全部 | ~12 | 全部 74 测试 |
| 6 | LOW 全部 | ~6 | 全部 74 测试 |

---

### 任务 1：安全漏洞修复（后端 CRITICAL）

**文件：**
- 修改：`server/src/routes/auth.js:39-46,102-117,173-196,246,298`
- 修改：`server/src/routes/subscribers.js:15-18`
- 修改：`server/src/routes/upload.js:78-85`
- 修改：`server/src/index.js:1-5,101-130`
- 修改：`server/package.json`

- [ ] **步骤 1：移除 API 响应中的敏感 Token**

auth.js 注册接口（第39-46行）：
```js
// 修改前
res.status(201).json({ user: users[0], token, verifyToken })

// 修改后
res.status(201).json({ user: users[0], token })
```

auth.js 忘记密码（第193-195行）：
```js
// 修改前
res.json({ success: true, message: '重置链接已发送到邮箱', resetToken })

// 修改后
res.json({ success: true, message: '重置链接已发送到邮箱' })
```

subscribers.js 订阅（第15-18行）：
```js
// 修改前
res.json({ message: '订阅成功，请查看邮箱确认', token })

// 修改后
res.json({ message: '订阅成功，请查看邮箱确认' })
```

- [ ] **步骤 2：修复路径遍历漏洞**

upload.js DELETE 路由（第78-85行）：
```js
const { basename } = require('path')
// 在 router.delete 处理器中，第79行之前添加：
const safeFilename = basename(req.params.filename)
const filepath = join(uploadsDir, safeFilename)
// 然后使用 safeFilename 替代 req.params.filename
```

- [ ] **步骤 3：管理员端点添加认证**

index.js 中给以下三个路由添加 `authRequired` 中间件：
- `GET /api/admin/analytics`（第101行）
- `GET /api/admin/stats`（第120行）
- `GET /api/subscribers`（第113行）

```js
app.get('/api/admin/analytics', authRequired, async (req, res) => { ... })
app.get('/api/subscribers', authRequired, async (req, res) => { ... })
app.get('/api/admin/stats', authRequired, async (req, res) => { ... })
```

- [ ] **步骤 4：OAuth Token 改为 Cookie 传递**

auth.js GitHub 回调（第246行）和 Google 回调（第298行）：
```js
// 修改前
res.redirect(siteUrl + '/oauth-callback?token=' + token)

// 修改后
res.cookie('oauth_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 5 * 60 * 1000 // 5分钟
})
res.redirect(siteUrl + '/oauth-callback')
```

- [ ] **步骤 5：忘记密码只保留 Token 验证**

auth.js（第173-196行），删除直接 email+username+newPassword 重置的分支：
```js
// 删除第173-196行中的直接重置逻辑
// 只保留：验证 resetToken → 更新密码 → 清除 token
// 如果没有 resetToken，返回错误提示需要先请求重置链接
```

- [ ] **步骤 6：JWT_SECRET 启动校验**

index.js 最顶部，在 `app.listen` 之前添加：
```js
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set')
  process.exit(1)
}
```

- [ ] **步骤 7：安装 Helmet 并配置安全头**

```bash
cd server && npm install helmet
```

index.js 添加：
```js
const helmet = require('helmet')
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
    }
  },
  hsts: process.env.NODE_ENV === 'production',
}))
```

- [ ] **步骤 8：扩展速率限制**

index.js 添加评论和文章创建的限流：
```js
const commentLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: '评论太快' })
const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: '重置请求太频繁' })

app.use('/api/comments', commentLimiter)
app.use('/api/auth/forgot-password', resetLimiter)
app.use('/api/auth/reset-password', resetLimiter)
```

- [ ] **步骤 9：运行后端测试**

```bash
cd C:/Users/Mechrevo/Downloads/map/map/server && npx vitest run
```
预期：32/32 通过

- [ ] **步骤 10：Commit**

---

### 任务 2：前端 CRITICAL 修复

**文件：**
- 修改：`src/pages/OAuthCallback.jsx`
- 修改：`src/context/AuthContext.jsx`
- 修改：`src/pages/Editor.jsx:222,348,503`
- 修改：`src/pages/BlogDetail.jsx:256`
- 新建：`src/pages/NotFound.jsx`
- 修改：`src/App.jsx`
- 修改：`package.json`

- [ ] **步骤 1：安装 DOMPurify**

```bash
npm install dompurify
```

- [ ] **步骤 2：XSS 防护 — Editor.jsx**

在 Editor.jsx 顶部添加：
```jsx
import DOMPurify from 'dompurify'
```

在 `dangerouslySetInnerHTML` 使用处包裹：
```jsx
// 第348行和503行
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parseMarkdown(formData.content)) }}
```

- [ ] **步骤 3：XSS 防护 — BlogDetail.jsx**

```jsx
import DOMPurify from 'dompurify'

// 第256行
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parseMarkdown(post.content)) }}
```

- [ ] **步骤 4：AuthContext 添加 loginWithToken**

AuthContext.jsx 添加：
```jsx
const loginWithToken = useCallback(async (token) => {
  setToken(token)
  try {
    const user = await api.auth.getMe()
    dispatch({ type: 'SET_USER', payload: user })
  } catch {
    clearToken()
    dispatch({ type: 'SET_USER', payload: null })
  }
}, [])
```

在 Provider value 中导出 `loginWithToken`。

- [ ] **步骤 5：OAuthCallback 重写**

```jsx
export default function OAuthCallback() {
  const { loginWithToken } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = getCookie('oauth_token')
    if (!token) {
      setError('授权失败，请重新登录')
      return
    }
    loginWithToken(token).then(() => {
      document.cookie = 'oauth_token=; max-age=0; path=/'
      navigate('/')
    })
  }, [])

  if (error) return <div className="...">{error}</div>
  return <LoadingSpinner />
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : null
}
```

- [ ] **步骤 6：Editor 未登录处理**

Editor.jsx 第222行：
```jsx
// 修改前
if (!user) return null

// 修改后
import { Navigate } from 'react-router-dom'
if (!user) return <Navigate to="/login" />
```

- [ ] **步骤 7：404 页面**

新建 `src/pages/NotFound.jsx`：
```jsx
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-600">404</h1>
      <p className="mt-4 text-lg text-gray-500">页面不存在</p>
      <Link to="/" className="mt-6 text-primary hover:underline">返回首页</Link>
    </div>
  )
}
```

App.jsx 添加路由（在 `</Routes>` 之前）：
```jsx
<Route path="*" element={<Lazy><NotFound /></Lazy>} />
```

- [ ] **步骤 8：运行前端测试**

```bash
cd C:/Users/Mechrevo/Downloads/map/map && npx vitest run
```
预期：42/42 通过

- [ ] **步骤 9：Commit**

---

### 任务 3：HIGH 后端修复

**文件：**
- 修改：`server/src/routes/auth.js:102-117`
- 修改：`server/src/config/db.js:6-14`
- 修改：`server/src/index.js:21`
- 新建：`server/migrations/_tracking.sql`
- 修改：`server/src/config/init.js`

- [ ] **步骤 1：用户资料动态 UPDATE**

auth.js PUT /auth/profile（第102-117行）：
```js
const fields = []
const values = []
for (const [key, val] of Object.entries({ username, bio, avatar, github })) {
  if (val !== undefined && val !== '') {
    fields.push(`${key} = ?`)
    values.push(val)
  }
}
if (fields.length === 0) {
  return res.status(400).json({ message: '没有提供要更新的字段' })
}
values.push(req.userId)
await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values)
```

- [ ] **步骤 2：DB 连接池配置**

db.js：
```js
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bloghub',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 5000,
})
```

- [ ] **步骤 3：trust proxy**

index.js app 创建后：
```js
app.set('trust proxy', 1)
```

- [ ] **步骤 4：迁移追踪**

新建 `server/migrations/_tracking.sql`：
```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL UNIQUE,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

init.js 添加迁移执行逻辑：
```js
async function runMigrations(pool) {
  await pool.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`)
  
  const fs = require('fs')
  const path = require('path')
  const migrationsDir = path.join(__dirname, '../../migrations')
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && f !== '_tracking.sql')
    .sort()
  
  const [executed] = await pool.query('SELECT filename FROM schema_migrations')
  const executedSet = new Set(executed.map(r => r.filename))
  
  for (const file of files) {
    if (!executedSet.has(file)) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      await pool.query(sql)
      await pool.query('INSERT INTO schema_migrations (filename) VALUES (?)', [file])
    }
  }
}
```

- [ ] **步骤 5：更新 express**

```bash
cd server && npm install express@^4.19.2
```

- [ ] **步骤 6：运行后端测试**

```bash
cd server && npx vitest run
```

- [ ] **步骤 7：Commit**

---

### 任务 4：HIGH 前端修复

**文件：**
- 修改：`src/pages/BlogDetail.jsx`
- 修改：`src/pages/BlogList.jsx`
- 修改：`src/pages/Home.jsx`
- 修改：`src/pages/Profile.jsx`
- 修改：`src/pages/Admin.jsx`
- 修改：`src/pages/Editor.jsx`
- 修改：`src/pages/MediaLibrary.jsx`
- 修改：`src/components/ShareButtons.jsx`
- 修改：`src/context/api.js`
- 新建：`src/components/Toast.jsx`
- 修改：`src/utils/errors.js`

- [ ] **步骤 1：Toast 组件**

新建 `src/components/Toast.jsx`：
```jsx
import { useState, useEffect, createContext, useContext, useCallback } from 'react'

const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-2 rounded-lg shadow-lg text-white text-sm transition-all ${
            t.type === 'error' ? 'bg-red-500' : t.type === 'success' ? 'bg-green-500' : 'bg-gray-700'
          }`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
```

- [ ] **步骤 2：ToastProvider 包裹 App**

main.jsx：
```jsx
import { ToastProvider } from './components/Toast'

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
```

- [ ] **步骤 3：errors.js showToast 关联**

errors.js：
```js
import { useToast } from '../components/Toast'
// showToast 改为使用 useToast hook
// 对于非组件中的使用，保留 alert 作为后备
export function showToast(message, type = 'info') {
  // 在组件中使用 useToast() hook
  // 此处保留 alert 作为非 React 上下文的降级方案
  alert(message)
}
```

- [ ] **步骤 4：数据加载错误处理 — BlogDetail/BlogList/Home/Profile/Admin**

每个页面添加 error 状态和 try-catch：

BlogDetail.jsx fetchData：
```jsx
const [error, setError] = useState(null)

const fetchData = useCallback(async () => {
  try {
    setLoading(true)
    setError(null)
    const post = await api.posts.getById(id)
    // ... 现有逻辑
  } catch (err) {
    setError(err.message || '加载失败')
  } finally {
    setLoading(false)
  }
}, [id])
```

JSX 中添加错误状态渲染：
```jsx
if (error) return <div className="text-center py-20 text-red-500">{error}</div>
```

BlogList.jsx, Home.jsx, Profile.jsx 同样模式。

Admin.jsx：
```jsx
const [stats, setStats] = useState(null)
const [error, setError] = useState(null)

useEffect(() => {
  (async () => {
    try {
      setError(null)
      const [statsRes, subscribersRes, analyticsRes] = await Promise.allSettled([
        api.request('/api/admin/stats'),
        api.request('/api/subscribers'),
        api.request('/api/admin/analytics'),
      ])
      // 处理每个结果...
    } catch (err) {
      setError('加载管理数据失败')
    }
  })()
}, [])
```

- [ ] **步骤 5：裸 fetch 改为 api 模块**

Editor.jsx 图片上传：
```jsx
// 修改前
const res = await fetch('/api/upload', {
  method: 'POST',
  headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` },
  body: formData,
})

// 修改后
const res = await api.upload(formData)  // 在 api.js 中添加 upload 方法
```

api.js 添加 upload 方法：
```js
upload: (formData) => {
  return fetch('/api/upload', {
    method: 'POST',
    headers: { Authorization: authHeaders().Authorization },
    body: formData,
  }).then(res => {
    if (!res.ok) throw new Error('上传失败')
    return res.json()
  })
}
```

MediaLibrary.jsx 同样改为 api.upload()。

Admin.jsx fetch 改为 api.request()。

- [ ] **步骤 6：CodeCopyButton 重写**

删除 ShareButtons.jsx 中第87-123行的全局 mouseover DOM 操作。

新建独立组件逻辑（内嵌在 SyntaxHighlight.jsx 中）：
```jsx
// 在 SyntaxHighlight.jsx 中，每个 code block 添加复制按钮
function CodeBlock({ children, language }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative group">
      <button onClick={handleCopy}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 px-2 py-1 text-xs bg-gray-700 text-white rounded">
        {copied ? '已复制' : '复制'}
      </button>
      <pre><code className={`language-${language}`}>{children}</code></pre>
    </div>
  )
}
```

- [ ] **步骤 7：运行前端测试**

```bash
npx vitest run
```

- [ ] **步骤 8：Commit**

---

### 任务 5：MEDIUM 修复

**文件：**
- 修改：`server/src/utils/errors.js`
- 修改：`server/src/middleware/validate.js`
- 修改：`src/hooks/useSEO.js`
- 修改：`src/components/Layout.jsx`
- 修改：`src/components/NotificationBell.jsx`
- 修改：`server/src/routes/posts.js`
- 修改：`server/init.sql`
- 新建：`server/migrations/010_post_likes_favorites.sql`

- [ ] **步骤 1：AppError 改 class**

server/src/utils/errors.js：
```js
export class AppError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}
```

更新所有 `AppError` 调用为 `new AppError(status, message)`。

- [ ] **步骤 2：validate 添加 email/URL 校验**

validate.js 添加规则：
```js
const validators = {
  required: (val) => val !== undefined && val !== null && val !== '',
  email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
  url: (val) => { try { new URL(val); return true } catch { return false } },
  min: (val, n) => String(val).length >= n,
  max: (val, n) => String(val).length <= n,
}
```

- [ ] **步骤 3：useSEO cleanup**

useSEO.js 返回 cleanup 函数：
```js
useEffect(() => {
  const created = []
  // 创建 meta 标签时 push 到 created 数组
  // ...
  return () => {
    created.forEach(el => el.remove())
  }
}, [title, description, image])
```

- [ ] **步骤 4：用户菜单键盘支持**

Layout.jsx 用户菜单添加 `onFocus/onBlur` 和 `aria-` 属性。

- [ ] **步骤 5：NotificationBell 可见性优化**

```jsx
useEffect(() => {
  let timer
  const poll = async () => {
    if (document.visibilityState === 'visible') {
      try { await fetchNotifications() } catch {}
    }
    timer = setTimeout(poll, 30000)
  }
  poll()
  return () => clearTimeout(timer)
}, [])
```

- [ ] **步骤 6：likes/favorites 独立表**

新建 `server/migrations/010_post_likes_favorites.sql`：
```sql
CREATE TABLE post_likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_post_user (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)

CREATE TABLE post_favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fav_post_user (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)
```

posts.js 中的 like/favorite 逻辑改为操作关联表。

- [ ] **步骤 7：slug 随机后缀**

posts.js slug 生成：
```js
const slug = customSlug || generateSlug(title) + '-' + Math.random().toString(36).slice(2, 8)
```

- [ ] **步骤 8：Cookie secure 标志**

posts.js Cookie 设置：
```js
res.cookie('viewed_posts', JSON.stringify(recentlyViewed.slice(-20)), {
  maxAge: 30 * 60 * 1000,
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
})
```

- [ ] **步骤 9：空 catch 改为 warn/next(err)**

所有空 catch 块添加 `console.warn(err)` 或 `next(err)`。

- [ ] **步骤 10：删除死代码 + TableOfContents 改组件**

- 删除 `email.js` 中的 `sendCommentNotification`
- `TableOfContents.jsx` 改为返回 JSX 的 React 组件

- [ ] **步骤 11：运行全量测试**

```bash
cd server && npx vitest run && cd .. && npx vitest run
```

- [ ] **步骤 12：Commit**

---

### 任务 6：LOW 修复

**文件：**
- 修改：`src/pages/Profile.jsx:112`
- 修改：`server/src/routes/users.js`
- 修改：`server/src/config/swagger.js`
- 修改：`src/pages/ForgotPassword.jsx`
- 修改：`.gitignore`
- 修改：`server/src/config/init.js`

- [ ] **步骤 1：Profile 性别中性化**

```jsx
// 修改前
"他的文章"

// 修改后
"{profile.username} 的文章"
```

- [ ] **步骤 2：users.js 统一用 AppError**

```js
const { AppError } = require('../utils/errors')
// ...
throw new AppError(404, '用户不存在')
```

- [ ] **步骤 3：Swagger 补充 schema**

swagger.js 添加各路由的 requestBody schema 定义。

- [ ] **步骤 4：ForgotPassword async/await 统一**

删掉 `.then()` 链式调用，全部改为 `await`。

- [ ] **步骤 5：.gitignore 补充**

```
.env.local
.env.production
*.pem
*.key
.vscode/
.idea/
```

- [ ] **步骤 6：init.js 错误日志**

```js
init().catch(err => { console.error('数据库初始化失败:', err); process.exit(1) })
```

- [ ] **步骤 7：运行全量测试**

- [ ] **步骤 8：Commit**

---
