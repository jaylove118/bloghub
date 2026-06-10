<div align="center">
  <img src="https://img.shields.io/badge/version-1.2.0-blue?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&style=flat-square" alt="React">
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&style=flat-square" alt="Vite">
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&style=flat-square" alt="Tailwind">
  <img src="https://img.shields.io/badge/Express-4-000000?logo=express&style=flat-square" alt="Express">
  <img src="https://img.shields.io/badge/TiDB-Serverless-DD4B39?style=flat-square" alt="TiDB">
  <img src="https://img.shields.io/badge/Cloudinary-3448C5?logo=cloudinary&style=flat-square" alt="Cloudinary">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
</div>

<br>

<h1 align="center">BlogHub</h1>

<p align="center">
  <b>全功能博客平台</b> · React + Express + TiDB + Cloudinary 全栈
</p>

<p align="center">
  从内容创作到社区互动，从 SEO 优化到数据分析——开箱即用的现代博客系统。
</p>

---

## 功能矩阵

### ✍️ 内容创作

- **Markdown 编辑器** — 工具栏（粗体/斜体/标题/引用/代码/列表）、分屏实时预览、图片上传插入
- **草稿保护** — localStorage 自动保存，刷新不丢失
- **定时发布** — 设置未来发布时间，到时自动上架
- **自定义 Slug** — 文章 URL 完全可控
- **版本历史** — 每次编辑自动保存版本，一键回滚（保留最近 10 个）
- **多图上传** — 编辑器内直接上传插入图片

### 👁️ 阅读体验

- **语法高亮** — highlight.js 按需加载，支持 190+ 语言
- **目录导航** — IntersectionObserver 实时跟踪阅读位置
- **阅读进度** — 顶部进度条 + 一键回到顶部
- **图片灯箱** — 点击文章内任意图片放大查看，支持封面图
- **相关推荐** — 基于分类和标签的智能推荐文章
- **响应式暗色模式** — Tailwind class 策略，手动切换 / 跟随系统

### 💬 社交互动

- **评论系统** — 嵌套回复 + 评论点赞
- **文章互动** — 点赞 / 收藏 / 分享（微信/微博/QQ/复制链接）
- **实时通知** — 30 秒轮询，未读计数角标，点赞/评论/回复即时提醒
- **代码复制** — 代码块一键复制按钮

### 👤 用户系统

- **JWT 认证** — bcrypt 密码哈希，Token 过期自动处理
- **第三方登录** — GitHub / Google OAuth
- **邮箱验证** — 验证码注册 + 重置密码令牌（1 小时有效）
- **个人主页** — 文章列表、获赞统计、个人置顶
- **资料设置** — 头像（DiceBear 随机 / 自定义上传）、Bio、GitHub 链接

### 📌 精选与置顶

- **全局精选** — 管理员在首页/管理后台一键设为精选，首页优先展示
- **个人置顶** — 用户在自己的主页置顶文章，仅个人主页可见
- **双轨独立** — 两者互不影响，精选 = 管理员全局策展，置顶 = 用户个人排版

### 📡 SEO 与增长

- **动态 Meta 标签** — useSEO Hook 自动设置 title/description/OG 图片
- **RSS 2.0** — `/api/rss` 标准 Feed
- **Sitemap** — `/api/sitemap.txt` 自动生成
- **全文搜索** — MySQL FULLTEXT + ngram 中文分词
- **邮件订阅** — 即时订阅/新文章推送/退订，首页 + Footer 双入口

### 🛡️ 管理与运营

- **管理后台** — 文章/用户/评论/访问量/反馈五维面板
- **数据分析** — 7 天流量趋势图 + 流量来源 TOP 10
- **媒体库** — Cloudinary 云存储，网格浏览、上传、删除，自动 CDN 分发
- **订阅管理** — 后台查看订阅者列表，支持删除
- **用户反馈** — 关于页提交反馈，后台分类查看（建议/Bug/好评/其他）

### 🔧 工程质量

- **自动化测试** — Vitest 前端 42 用例 + 后端 32 用例（含 E2E 冒烟测试）
- **Swagger 文档** — `/api/docs` 交互式 API 文档
- **安全加固** — Helmet + CORS + CSP + bcrypt + 速率限制 + 参数化查询
- **代码分割** — 6 个页面懒加载，主包 940KB
- **错误边界** — ErrorBoundary 组件兜底，统一错误处理

---

## 技术栈

| 层级 | 技术 | 用途 |
|:-----|:-----|:-----|
| 前端框架 | React 18 | UI 组件 + Hooks |
| 路由 | React Router v6 | SPA 页面路由 |
| 构建 | Vite 5 | 开发/构建 |
| 样式 | Tailwind CSS 3 | 原子化 CSS + 暗色模式 |
| 后端 | Express 4 | REST API + 中间件 |
| 数据库 | TiDB Cloud (MySQL 兼容) | Serverless 自动扩缩 |
| 认证 | JWT + bcryptjs | Token 认证 + 密码哈希 |
| 邮件 | Nodemailer (QQ SMTP) | 验证码/重置密码/订阅推送/评论通知 |
| 图片 | Cloudinary + Multer | 云存储/CDN/自动优化 |
| 高亮 | highlight.js | 代码语法着色 |
| 测试 | Vitest | 单元 + E2E 测试 |
| 文档 | Swagger UI | API 交互式文档 |
| 部署 | Railway | 自动部署（GitHub 推送触发） |

---

## 快速开始

### 环境要求

- Node.js ≥ 18

### 1. 克隆项目

```bash
git clone https://github.com/Jaylove118/bloghub.git
cd bloghub
```

### 2. 配置环境变量

在 `server/` 目录创建 `.env`：

```env
# 数据库 (TiDB Cloud)
DB_HOST=gateway01.ap-northeast-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USER=你的TiDB用户名
DB_PASSWORD=你的TiDB密码
DB_NAME=bloghub
DB_SSL=true

# 安全
JWT_SECRET=生成一个随机字符串（openssl rand -hex 32）
PORT=3001

# OAuth（可选）
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Cloudinary 图片云存储（可选）
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# 邮件（可选，用于验证码/重置密码/订阅推送）
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=你的邮箱
SMTP_PASS=SMTP 授权码
SMTP_FROM=你的邮箱

# 站点
SITE_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
```

### 3. 安装依赖

```bash
npm install
cd server && npm install && cd ..
```

### 4. 启动

```bash
# 终端 1：后端（端口 3001）
cd server && npm run dev

# 终端 2：前端（端口 5173）
npm run dev
```

浏览器访问 `http://localhost:5173`

### 5. 运行测试

```bash
npm test                    # 前端 42 用例
cd server && npm test       # 后端 32 用例（含 E2E）
```

---

## 项目结构

```
bloghub/
├── src/                          # 前端源码
│   ├── components/               # 通用组件
│   │   ├── Layout.jsx            # 全局布局（导航/侧边栏/Footer/主题切换）
│   │   ├── LoadingSpinner.jsx    # 加载动画
│   │   ├── ErrorBoundary.jsx     # 错误边界
│   │   ├── CoverPlaceholder.jsx  # 封面占位图
│   │   ├── NotificationBell.jsx  # 通知铃铛
│   │   ├── TableOfContents.jsx   # 文章目录导航
│   │   ├── ReadingProgress.jsx   # 阅读进度条 + 回到顶部
│   │   ├── ShareButtons.jsx      # 社交分享 + 代码复制
│   │   ├── SyntaxHighlight.jsx   # 代码语法高亮
│   │   ├── RelatedPosts.jsx      # 相关文章推荐（标签交集优先）
│   │   ├── Skeleton.jsx          # 骨架屏加载态
│   │   └── SubscribeForm.jsx     # 邮件订阅表单
│   ├── pages/                    # 页面（10+个）
│   │   ├── Home.jsx              # 首页（精选 Hero + 全部/精选 Tab）
│   │   ├── BlogList.jsx          # 博客浏览（分类/标签/搜索）
│   │   ├── BlogDetail.jsx        # 文章详情（目录/进度/分享/图片灯箱）
│   │   ├── Editor.jsx            # Markdown 编辑器（工具栏/分屏/图片上传）
│   │   ├── Login.jsx             # 登录
│   │   ├── Register.jsx          # 注册
│   │   ├── ForgotPassword.jsx    # 忘记密码
│   │   ├── OAuthCallback.jsx     # OAuth 回调处理
│   │   ├── Profile.jsx           # 用户主页（置顶/编辑/删除）
│   │   ├── Settings.jsx          # 个人设置
│   │   ├── Admin.jsx             # 管理后台（统计/文章/用户/反馈/订阅）
│   │   ├── About.jsx             # 关于（技术栈/反馈表单）
│   │   └── NotFound.jsx          # 404
│   ├── context/                  # React Context
│   │   ├── AuthContext.jsx       # 认证状态 + JWT
│   │   ├── ThemeContext.jsx      # 暗色模式
│   │   └── api.js                # API 调用层（17 个模块）
│   ├── hooks/                    # 自定义 Hook
│   │   ├── useSEO.js             # 动态 Meta/OG 标签
│   │   └── useTableOfContents.js # 目录数据解析
│   ├── utils/                    # 工具函数
│   │   ├── constants.js          # 分类映射 / 99标签库 / 工具函数
│   │   └── errors.js             # 统一错误处理
│   ├── lib/                      # 独立模块
│   │   ├── index.js              # Markdown 解析器入口
│   │   └── markdown-parser.ts    # 解析器核心（TypeScript）
│   └── __tests__/                # 前端测试
├── server/                       # 后端源码
│   ├── src/
│   │   ├── index.js              # Express 入口 + RSS/Sitemap/Stats
│   │   ├── config/
│   │   │   ├── db.js             # MySQL 连接池 + 自动建表
│   │   │   └── swagger.js        # Swagger 文档定义
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT 认证 + adminRequired
│   │   │   └── validate.js       # 请求参数校验
│   │   ├── routes/               # API 路由（7 个模块）
│   │   │   ├── auth.js           # 认证（登录/注册/OAuth/验证码/重置密码）
│   │   │   ├── posts.js          # 文章（CRUD/标签/版本/精选/置顶）
│   │   │   ├── comments.js       # 评论（嵌套回复/点赞/通知）
│   │   │   ├── users.js          # 用户
│   │   │   ├── upload.js         # 图片上传（Cloudinary 云存储）
│   │   │   ├── notifications.js  # 通知
│   │   │   ├── subscribers.js    # 邮件订阅
│   │   │   └── feedback.js       # 用户反馈
│   │   ├── utils/
│   │   │   ├── cloudinary.js     # Cloudinary 上传/列表/删除
│   │   │   ├── email.js          # Nodemailer 邮件发送
│   │   │   └── errors.js         # AppError 自定义错误类
│   │   └── __tests__/            # 后端测试
│   ├── migrations/               # 数据库迁移（12 个 SQL）
│   ├── uploads/                  # 上传文件目录
│   └── init.sql                  # 完整建表 SQL
├── public/
│   └── favicon.svg               # 网站图标
├── docs/                         # 设计文档
├── package.json
├── vite.config.js                # Vite 配置 + API 代理
└── tailwind.config.js
```

---

## API 一览

### 认证 `/api/auth`

| 方法 | 路径 | 说明 | 认证 |
|:-----|:-----|:-----|:----:|
| POST | `/register` | 注册（含邮箱验证码） | |
| POST | `/login` | 登录 | |
| GET | `/me` | 当前用户信息 | ✓ |
| PUT | `/profile` | 更新个人资料 | ✓ |
| PUT | `/password` | 修改密码 | ✓ |
| POST | `/send-verify-code` | 发送邮箱验证码 | |
| POST | `/forgot-password` | 发送重置密码邮件 | |
| POST | `/reset-password` | 重置密码 | |
| GET | `/verify-email?token=` | 验证邮箱 | |
| GET | `/github` | GitHub OAuth | |
| GET | `/github/callback` | GitHub OAuth 回调 | |
| GET | `/google` | Google OAuth | |
| GET | `/google/callback` | Google OAuth 回调 | |

### 文章 `/api/posts`

| 方法 | 路径 | 说明 | 认证 |
|:-----|:-----|:-----|:----:|
| GET | `/` | 列表（?category=&tag=&search=&authorId=&featured=&page=&limit=） | |
| GET | `/tags/all` | 标签云 | |
| GET | `/:idOrSlug` | 文章详情（自动增加阅读量） | |
| POST | `/` | 创建文章 | ✓ |
| PUT | `/:id` | 更新（自动保存版本） | ✓ |
| DELETE | `/:id` | 删除 | ✓ |
| POST | `/:id/like` | 点赞/取消（触发通知） | ✓ |
| POST | `/:id/favorite` | 收藏/取消 | ✓ |
| PUT | `/:id/pin` | 精选切换（仅管理员） | ✓ |
| PUT | `/:id/profile-pin` | 个人置顶切换（仅作者） | ✓ |
| GET | `/:id/revisions` | 版本历史 | |
| POST | `/:id/restore/:revId` | 回滚版本 | ✓ |

### 评论 `/api/comments`

| 方法 | 路径 | 说明 | 认证 |
|:-----|:-----|:-----|:----:|
| GET | `/post/:postId` | 文章评论 | |
| POST | `/` | 创建评论（parentId 嵌套） | ✓ |
| DELETE | `/:id` | 删除 | ✓ |
| POST | `/:id/like` | 点赞 | ✓ |

### 反馈 `/api/feedback`

| 方法 | 路径 | 说明 | 认证 |
|:-----|:-----|:-----|:----:|
| POST | `/` | 提交反馈 | |
| GET | `/` | 查看全部（仅管理员） | ✓ |

### 订阅 `/api/subscribers`

| 方法 | 路径 | 说明 | 认证 |
|:-----|:-----|:-----|:----:|
| POST | `/subscribe` | 订阅（即时生效） | |
| GET | `/status` | 当前用户订阅状态 | ✓ |
| POST | `/unsubscribe` | 退订 | |
| GET | `/` | 订阅者列表（仅管理员） | ✓ |

### 通知 `/api/notifications`

| 方法 | 路径 | 说明 | 认证 |
|:-----|:-----|:-----|:----:|
| GET | `/` | 通知列表 | ✓ |
| PUT | `/read-all` | 全部标记已读 | ✓ |
| PUT | `/:id/read` | 单条标记已读 | ✓ |

### 其他

| 方法 | 路径 | 说明 |
|:-----|:-----|:-----|
| GET | `/api/health` | 健康检查 |
| GET | `/api/rss` | RSS 2.0 Feed |
| GET | `/api/sitemap.txt` | Sitemap |
| GET | `/api/admin/stats` | 管理统计 |
| GET | `/api/admin/analytics` | 7 天流量 + 来源 |
| GET | `/api/admin/posts` | 全部文章（管理员） |
| GET | `/api/admin/users` | 全部用户（管理员） |
| GET | `/api/docs` | Swagger UI |

---

## 数据库表

| 表名 | 说明 | 核心字段 |
|:-----|:-----|:-----|
| `users` | 用户 | email, password, avatar, bio, role, email_verified |
| `posts` | 文章 | title, slug, content, tags (JSON), is_pinned, is_profile_pinned, scheduled_at |
| `comments` | 评论 | content, parent_id, likes (JSON) |
| `notifications` | 通知 | type, actor_id, post_id, is_read |
| `post_revisions` | 版本历史 | post_id, title, content, revised_by |
| `subscribers` | 邮件订阅 | email, is_verified, created_at |
| `analytics_views` | 访问统计 | post_id, viewer_ip, referrer, user_agent |
| `feedbacks` | 用户反馈 | name, email, type, content, user_id |
| `email_verifications` | 邮箱验证码 | email, code, expires_at |

---

## 部署

项目已部署在 [Railway](https://railway.app) → **[bloghub-jay.up.railway.app](https://bloghub-jay.up.railway.app)**，推送 `master` 分支自动触发构建部署。

### 部署到 Railway

1. Fork 本仓库
2. 在 Railway 新建项目 → Deploy from GitHub repo
3. 添加 TiDB Cloud 数据库（或使用 Railway MySQL 插件）
4. 设置环境变量（参考上方配置表）
5. Railway 自动检测 `railway.toml` 并构建部署

---

## 贡献

1. Fork 仓库
2. 创建分支：`git checkout -b feature/xxx`
3. 提交：`git commit -m 'feat: xxx'`（遵循 [约定式提交](https://www.conventionalcommits.org/zh-hans/)）
4. 推送：`git push origin feature/xxx`
5. 发起 Pull Request

---

## 许可证

[MIT](LICENSE)
