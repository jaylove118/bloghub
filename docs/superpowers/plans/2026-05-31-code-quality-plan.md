# 代码质量提升 实现计划

> **面向 AI 代理的工作者：** 使用 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 清理调试代码、抽离 Swagger 文档、统一前端错误处理，不改动业务逻辑

**架构：** 保守策略——只做纯移动和纯删除，不动组件结构。新增 2 个文件（swagger.js + errors.js），修改 9 个文件

**技术栈：** React 18 + Vite 5 + TailwindCSS, Express 4 + MySQL2

---

### 任务 1：后端 — 抽离 Swagger 文档 + 清理 console.log

**文件：**
- 创建：`server/src/config/swagger.js`
- 修改：`server/src/index.js:42-177`
- 修改：`server/src/utils/email.js:19,31`
- 修改：`server/src/config/init.js:22,26`

- [ ] **步骤 1：创建 swagger.js**

把 `server/src/index.js` 第 42-76 行的 `swaggerDoc` 对象移到新文件：

`server/src/config/swagger.js`:
```js
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

export default swaggerDoc
```

- [ ] **步骤 2：修改 index.js — 引入 swagger 并清理 console**

1. 在第 7 行后添加 import: `import swaggerDoc from './config/swagger.js'`
2. 删除第 42-76 行（内联 swaggerDoc 定义）
3. 删除第 176 行 `console.log('BlogHub server running on...')`，改为无输出或保留静默启动
4. 删除第 170 行 `console.error('[Error]', err.message)` —— 500 错误已在响应中返回，无需额外打印

- [ ] **步骤 3：清理 email.js 和 init.js 的 console**

`server/src/utils/email.js`:
- 删除第 19 行 `console.log('[Email] SMTP not configured...')`
- 删除第 31 行 `console.error('[Email] Send failed:', err.message)`

`server/src/config/init.js`:
- 删除第 22 行 `console.log('Database initialized successfully.')`
- 第 26 行 `init().catch(console.error)` → `init().catch(() => process.exit(1))`

- [ ] **步骤 4：验证后端启动**

运行：`cd server && timeout 5 node src/index.js 2>&1 || true`
预期：无 console 输出，服务器正常启动在 3001 端口（timeout 属于预期行为）

- [ ] **步骤 5：运行后端测试**

```bash
cd server && npm test
```
预期：32/32 通过

- [ ] **步骤 6：Commit**

```bash
git add server/src/config/swagger.js server/src/index.js server/src/utils/email.js server/src/config/init.js
git commit -m "refactor: 抽离 Swagger 文档 + 清理后端 console.log"
```

---

### 任务 2：前端 — 创建错误处理工具函数

**文件：**
- 创建：`src/utils/errors.js`

- [ ] **步骤 1：创建 errors.js**

`src/utils/errors.js`:
```js
export function handleError(error, setError) {
  const message = error?.message || '操作失败，请稍后重试'
  if (setError) setError(message)
}

export function showToast(message) {
  alert(message)
}
```

> 先用 alert 保持与现有行为一致。后续可以换成 toast 组件。

- [ ] **步骤 2：验证测试**

```bash
npx vitest run src/__tests__/api-normalize.test.js
```
预期：通过（新文件不破坏任何导入链路）

---

### 任务 3：前端 — 统一错误处理 + 清理 console.error

**文件：**
- 修改：`src/pages/BlogDetail.jsx:79-162`
- 修改：`src/pages/Editor.jsx:12-22,176-215`
- 修改：`src/pages/Settings.jsx:41-48`
- 不修改：`src/components/ErrorBoundary.jsx`（保留 console.error，故意为之）
- 不修改：`src/__tests__/markdown-parser.test.ts`（测试代码）

- [ ] **步骤 1：BlogDetail.jsx — 6 个 catch 块的 console.error → handleError**

每个 `catch (error) { console.error(error) }` 替换为 `catch (error) { handleError(error, setError) }`

在第 1 行添加 import: `import { handleError } from '../utils/errors'`

在组件顶部添加 error state: `const [error, setError] = useState(null)`

在 JSX 顶部添加错误提示（当 error 存在时显示）:
```jsx
{error && (
  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
    {error}
    <button onClick={() => setError(null)} className="ml-2 font-bold">&times;</button>
  </div>
)}
```

涉及 6 个函数：handleFavorite(79), handlePin(88), handleDelete(98), handleDeleteComment(129), handleReply(147), handleCommentLike(160)

- [ ] **步骤 2：Editor.jsx — 3 个隐式 catch + 1 个 console.error**

import 添加: `import { handleError } from '../utils/errors'`
添加 state: `const [saveError, setSaveError] = useState(null)`

两处 `catch {}`（行 15, 22）保持不变——localStorage 操作失败静默处理是合理的。

`catch { alert('图片上传失败') }`（行 176-177）→ 替换为 `catch (err) { alert('图片上传失败') }`（保持行为，加参数名）

`catch (error) { console.error(error); alert('保存失败') }`（行 213-215）→ 替换为:
```js
catch (error) {
  handleError(error, setSaveError)
}
```
去掉 `alert('保存失败')`，改用统一的错误状态显示。在 JSX 中添加 `saveError` 的显示。

- [ ] **步骤 3：Settings.jsx — 1 个 console.error**

import 添加: `import { handleError } from '../utils/errors'`
添加 state: 已有 `error` state，复用即可

`catch (error) { console.error(error) }`（行 44-45）→ 替换为 `catch (error) { handleError(error, setError) }`

- [ ] **步骤 4：运行前端测试**

```bash
npx vitest run
```
预期：42/42 通过

- [ ] **步骤 5：Commit**

```bash
git add src/utils/errors.js src/pages/BlogDetail.jsx src/pages/Editor.jsx src/pages/Settings.jsx
git commit -m "refactor: 统一前端错误处理 + 清理 console.error"
```

---

### 任务 4：最终验证

- [ ] **步骤 1：运行全部测试**

```bash
cd server && npm test && cd .. && npx vitest run
```
预期：后端 32/32 + 前端 42/42 = 74/74 全通过

- [ ] **步骤 2：启动项目验证**

```bash
cd server && node src/index.js &
cd .. && npx vite &
```
手动验证：
- 打开 `http://localhost:5173`
- 检查 API docs `http://localhost:5173/api/docs` 正常显示
- 登录、浏览文章、点赞/收藏

- [ ] **步骤 3：最终 Commit（如有遗漏修改）**

```bash
git add -A
git diff --cached --stat  # 确认只有预期的文件
git commit -m "chore: 代码质量提升完成"  # 仅在有额外修改时
```
