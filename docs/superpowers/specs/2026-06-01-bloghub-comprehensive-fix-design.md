# BlogHub 全面修复设计规格

## 概述

基于三方审计（后端28项 + 前端26项 + 安全配置20项），修复全部问题：12 CRITICAL + 11 HIGH + 14 MEDIUM + 8 LOW = 45 项。

## 核心原则

- **每批修完跑全量测试**，74个测试必须维持全绿
- **只修不改逻辑**，不引入新功能，不重构架构
- **分批 commit**，每批一个提交，方便回溯

## 第一节：安全漏洞修复（6 CRITICAL）

### 1.1 Token 泄露修复

| 文件 | 行号 | 改动 |
|------|------|------|
| `server/src/routes/auth.js` | 46 | 响应删除 `verifyToken` |
| `server/src/routes/auth.js` | 195 | 响应删除 `resetToken` |
| `server/src/routes/subscribers.js` | 17 | 响应删除 `token` |

### 1.2 路径遍历修复

`server/src/routes/upload.js:79` — `req.params.filename` 用 `basename()` 包裹。

### 1.3 管理后台鉴权

`server/src/index.js:101,113,120` — 三个端点添加 `authRequired` 中间件。

### 1.4 OAuth Token 传递

- `server/src/routes/auth.js:246,298` — 改 URL query → httpOnly Cookie
- `src/pages/OAuthCallback.jsx` — 从 Cookie 读 token，调用 `loginWithToken`

### 1.5 忘记密码二步流程

`server/src/routes/auth.js:173-196` — 删除直接重置分支，只保留 token 验证。

### 1.6 JWT_SECRET 启动校验

`server/src/index.js` — 启动时检查，未设置则 `process.exit(1)`。

## 第二节：前端 CRITICAL（6 项）

### 2.1 XSS 防线

- 安装 `dompurify`
- `Editor.jsx:348,503` 和 `BlogDetail.jsx:256` — `dangerouslySetInnerHTML` 前过 DOMPurify

### 2.2 OAuth 竞态

- `AuthContext.jsx` — 新增 `loginWithToken(token)` 方法
- `OAuthCallback.jsx` — 删 `window.location.reload()`，用 `loginWithToken`

### 2.3 Editor 未登录

`Editor.jsx:222` — `return null` → `<Navigate to="/login" />`

### 2.4 404 路由

- 新建 `src/pages/NotFound.jsx`
- `App.jsx` — 添加 `<Route path="*" element={<NotFound />} />`

## 第三节：HIGH 后端（5 项）

### 3.1 用户资料动态更新

`server/src/routes/auth.js:102-117` — 只 UPDATE 请求中实际提供的字段。

### 3.2 连接池配置

`server/src/config/db.js` — 添加 `charset: 'utf8mb4'`, `connectTimeout: 5000`。

### 3.3 trust proxy

`server/src/index.js` — `app.set('trust proxy', 1)`。

### 3.4 迁移追踪

- 新建 `server/migrations/_tracking.sql` — 创建 `schema_migrations` 表
- `server/src/config/init.js` — 启动时检查并执行未应用的迁移

### 3.5 Express 升级

`server/package.json` — `express: ^4.19.2`

## 第四节：HIGH 前端（6 项）

### 4.1 数据加载错误处理

BlogDetail.jsx, BlogList.jsx, Home.jsx, Profile.jsx, Admin.jsx — 所有 `fetchData` 包裹 try-catch，添加 `error` 状态和错误 UI。

### 4.2 CodeCopyButton 重写

`ShareButtons.jsx` — 删除全局 mouseover DOM 操作，改为独立 React 组件 `CodeCopyButton`。

### 4.3 统一 api 模块

Editor.jsx, Admin.jsx, MediaLibrary.jsx — 裸 fetch 改为 `api.request()`。

### 4.4 Toast 组件

- 新建 `src/components/Toast.jsx` — 轻量 toast 通知
- 全局替换 8 处 `alert()` → `showToast()`

### 4.5 速率限制扩展

`server/src/index.js` — 添加评论/文章/密码重置限流器。

### 4.6 Helmet

- 安装 `helmet`
- `server/src/index.js` — 配置 CSP, HSTS, X-Frame-Options

## 第五节：MEDIUM（14 项）

- AppError 改 class
- validate 加 email/URL 校验
- useSEO cleanup
- 用户菜单键盘支持
- NotificationBell 可见性检查
- likes/favorites → 独立表
- slug 随机后缀
- Cookie secure 标志
- tags SQL 聚合
- 空 catch → next(err)/warn
- 邮件失败 warn
- 删除 sendCommentNotification 死代码
- TableOfContents 改组件

## 第六节：LOW（8 项）

- Profile 性别中性化
- users.js 统一 AppError
- Swagger 补充 schema
- ForgotPassword async/await 统一
- .gitignore 补充
- init.js 错误日志

## 测试策略

每批修复后执行：
```bash
cd server && npx vitest run
cd .. && npx vitest run
```

74 个测试必须全部通过。任何失败立即排查修复。
