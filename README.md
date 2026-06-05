# BlogHub

> 全功能博客平台，42项功能，74个自动化测试。React + Express + MySQL 全栈。

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql)
![License](https://img.shields.io/badge/license-MIT-green)

## 项目简介

BlogHub 是一个从零构建的全栈博客平台，对标 Ghost/Medium 的核心体验。独立完成了前端、后端、数据库设计、安全加固和自动化测试。

**适合人群：** 个人博主、技术团队、作为全栈项目学习参考。

## 功能特性

### 内容创作
- Markdown 编辑器，支持格式工具栏、分屏实时预览
- 草稿自动保存（localStorage），刷新不丢失
- 定时发布，自定义文章 Slug
- 编辑历史版本，一键回滚（最多保留 10 个版本）

### 阅读体验
- 代码语法高亮（highlight.js，按需加载）
- 文章目录导航（IntersectionObserver 滚动跟踪）
- 阅读进度条 + 回到顶部
- 相关文章推荐

### 社交互动
- 评论系统（嵌套回复 + 点赞）
- 文章点赞 / 收藏
- 通知中心（30 秒轮询，实时未读计数）
- 社交分享（微信 / 微博 / QQ / 复制链接）
- 代码块一键复制

### 用户系统
- JWT 认证 + bcrypt 密码哈希
- GitHub / Google OAuth 第三方登录
- 邮件验证码注册 + 重置密码令牌（1 小时有效）
- 个人主页与资料设置

### SEO 与增长
- 动态 Meta / OG 标签（useSEO）
- RSS 2.0 Feed + Sitemap XML
- MySQL FULLTEXT 中文全文搜索（ngram 分词）
- 邮件订阅 / 退订
- 数据分析面板（7 天流量趋势 + 来源 TOP 10）

### 管理与运营
- 管理后台仪表盘（文章 / 用户 / 评论 / 访问量统计）
- 媒体库（网格浏览、上传、删除、Sharp 缩略图 + WebP 转换）
- 标签云 API，分类筛选

### 工程质量
- 74 个自动化测试（后端 32 + 前端 42，Vitest）
- Swagger API 文档（`/api/docs`）
- Helmet + CORS + CSP + 速率限制
- 参数化查询防 SQL 注入
- 代码分割（主包 939KB，6 个页面懒加载）
- 暗色模式（Tailwind CSS class 策略）

## 截图

> 启动项目后访问 http://localhost:5173 查看完整效果。

| 页面 | 说明 |
|------|------|
| `/` | 首页 Hero + 文章列表 |
| `/blogs` | 文章浏览（分类 / 标签 / 搜索） |
| `/blog/:slug` | 文章详情（目录 / 进度条 / 分享 / 代码高亮） |
| `/editor` | Markdown 编辑器（工具栏 / 分屏 / 定时发布） |
| `/login` / `/register` | 登录注册（含 OAuth 按钮） |
| `/admin` | 管理后台统计面板 |
| `/media` | 媒体库管理 |
| `/settings` | 个人设置 |

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + React Router v6 |
| 构建工具 | Vite 5 |
| UI | TailwindCSS 3（暗色模式 class 策略） |
| 后端 | Express 4 + Node.js |
| 数据库 | MySQL 8 + mysql2 连接池 |
| 认证 | JWT（jsonwebtoken）+ bcryptjs |
| 邮件 | Nodemailer |
| 图片处理 | Sharp + Multer |
| 代码高亮 | highlight.js |
| 测试 | Vitest（后端 32 + 前端 42） |
| API 文档 | Swagger UI（swagger-ui-express） |

## 项目结构

```
map/
├── src/                          # 前端源码
│   ├── components/               # 公用组件（15 个）
│   │   ├── Layout.jsx            # 全局布局（导航 + 侧边栏 + 主题切换）
│   │   ├── ErrorBoundary.jsx     # 错误边界
│   │   ├── NotificationBell.jsx  # 通知铃铛 + 下拉列表
│   │   ├── TableOfContents.jsx   # 文章目录导航
│   │   ├── ReadingProgress.jsx   # 阅读进度条 + 回到顶部
│   │   ├── ShareButtons.jsx      # 社交分享 + 代码块复制
│   │   ├── SyntaxHighlight.jsx   # 代码语法高亮
│   │   ├── RelatedPosts.jsx      # 相关文章推荐
│   │   └── Footer.jsx            # 页脚
│   ├── pages/                    # 页面（14 个）
│   │   ├── Home.jsx              # 首页
│   │   ├── BlogList.jsx          # 文章列表
│   │   ├── BlogDetail.jsx        # 文章详情
│   │   ├── Editor.jsx            # Markdown 编辑器
│   │   ├── Login.jsx             # 登录
│   │   ├── Register.jsx          # 注册
│   │   ├── ForgotPassword.jsx    # 忘记密码
│   │   ├── OAuthCallback.jsx     # OAuth 回调
│   │   ├── Profile.jsx           # 用户主页
│   │   ├── Settings.jsx          # 个人设置
│   │   ├── Admin.jsx             # 管理后台
│   │   ├── Media.jsx             # 媒体库
│   │   ├── About.jsx             # 关于
│   │   └── NotFound.jsx          # 404
│   ├── context/                  # React Context
│   │   ├── AuthContext.jsx       # 认证状态管理
│   │   ├── ThemeContext.jsx      # 暗色模式管理
│   │   └── api.js                # API 调用层
│   ├── hooks/                    # 自定义 Hook
│   │   ├── useSEO.js             # SEO 动态 Meta 标签
│   │   └── useTableOfContents.js # 目录数据解析
│   ├── utils/                    # 工具函数
│   │   ├── errors.js             # 统一错误处理
│   │   └── token.js              # Token 管理
│   ├── lib/                      # 独立模块
│   │   └── markdown-parser.ts    # Markdown 解析器（TypeScript）
│   └── __tests__/                # 前端测试（3 文件，42 用例）
├── server/                       # 后端源码
│   ├── src/
│   │   ├── index.js              # Express 入口 + RSS/Sitemap/Stats
│   │   ├── config/
│   │   │   ├── db.js             # MySQL 连接池
│   │   │   ├── swagger.js        # Swagger 文档定义
│   │   │   └── init.js           # 数据库初始化脚本
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT 认证中间件
│   │   │   └── validate.js       # 请求参数校验
│   │   ├── routes/               # API 路由（7 个模块）
│   │   │   ├── auth.js           # /api/auth（登录/注册/OAuth/忘记密码）
│   │   │   ├── posts.js          # /api/posts（文章 CRUD + 版本历史 + 标签）
│   │   │   ├── comments.js       # /api/comments（评论 + 通知触发）
│   │   │   ├── users.js          # /api/users
│   │   │   ├── upload.js         # /api/upload（图片上传/列表/删除 + Sharp）
│   │   │   ├── notifications.js  # /api/notifications
│   │   │   └── subscribers.js    # /api/subscribers（邮件订阅）
│   │   ├── utils/
│   │   │   ├── email.js          # Nodemailer 邮件发送
│   │   │   └── errors.js         # 自定义错误类
│   │   └── __tests__/            # 后端测试（2 文件，32 用例含 E2E）
│   ├── migrations/               # 数据库迁移（9 个 SQL 文件）
│   ├── uploads/                  # 上传文件目录
│   ├── .env                      # 环境变量
│   └── init.sql                  # 完整建表 SQL
├── docs/                         # 设计文档
├── package.json                  # 前端依赖
├── vite.config.js                # Vite 配置 + API 代理
└── tailwind.config.js            # Tailwind 配置（darkMode: class）
```

## 本地运行

### 前置条件

- Node.js >= 18
- MySQL >= 8.0

### 1. 创建数据库

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS bloghub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql -u root -p bloghub < server/init.sql
```

### 2. 执行数据库迁移

```bash
cd server
for f in migrations/*.sql; do
  mysql -u root -p bloghub < "$f"
done
cd ..
```

### 3. 配置环境变量

编辑 `server/.env`：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=bloghub
JWT_SECRET=生成一个随机字符串
PORT=3001

# OAuth（可选，不填则隐藏 OAuth 按钮）
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# 邮件（可选，不填则跳过邮件验证）
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=你的邮箱
SMTP_PASS=你的SMTP授权码

# 站点地址
SITE_URL=http://localhost:5173
```

### 4. 安装依赖

```bash
npm install          # 前端依赖
cd server && npm install && cd ..  # 后端依赖
```

### 5. 启动

```bash
# 终端1：启动后端（端口 3001）
cd server && npm run dev

# 终端2：启动前端（端口 5173）
npm run dev
```

浏览器访问 `http://localhost:5173`

### 6. 运行测试

```bash
npm test                    # 前端测试（42 用例）
cd server && npm test       # 后端测试（32 用例，含 E2E 冒烟）
```

## 配置说明

### 环境变量

| 变量 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `DB_HOST` | string | localhost | MySQL 主机地址 |
| `DB_PORT` | number | 3306 | MySQL 端口 |
| `DB_USER` | string | root | MySQL 用户名 |
| `DB_PASSWORD` | string | - | MySQL 密码（必填） |
| `DB_NAME` | string | bloghub | 数据库名 |
| `JWT_SECRET` | string | - | JWT 签名密钥（必填，随机生成） |
| `PORT` | number | 3001 | 后端端口 |
| `SITE_URL` | string | http://localhost:5173 | 站点地址（RSS/Sitemap 使用） |
| `GITHUB_CLIENT_ID` | string | - | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | string | - | GitHub OAuth App Client Secret |
| `GOOGLE_CLIENT_ID` | string | - | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | string | - | Google OAuth Client Secret |
| `SMTP_HOST` | string | - | SMTP 服务器地址 |
| `SMTP_PORT` | number | 587 | SMTP 端口 |
| `SMTP_USER` | string | - | 发件邮箱 |
| `SMTP_PASS` | string | - | SMTP 授权码 |
| `ALLOWED_ORIGINS` | string | localhost:5173 | 允许的 CORS 来源（逗号分隔） |
| `NODE_ENV` | string | development | 环境（production 时启用 CSP/HSTS） |

### 数据库表

| 表名 | 说明 |
|------|------|
| `users` | 用户（含 email_verified） |
| `posts` | 文章（status / slug / scheduled_at / FULLTEXT 索引） |
| `comments` | 评论（支持 parent_id 嵌套） |
| `notifications` | 通知（点赞 / 评论 / 回复） |
| `post_revisions` | 文章版本历史 |
| `subscribers` | 邮件订阅 |
| `analytics_views` | 访问统计 |

## API 接口

### 认证 (`/api/auth`)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 用户注册 | 否 |
| POST | `/api/auth/login` | 用户登录 | 否 |
| GET | `/api/auth/me` | 获取当前用户 | 是 |
| PUT | `/api/auth/profile` | 更新个人资料 | 是 |
| POST | `/api/auth/forgot-password` | 发送重置邮件 | 否 |
| POST | `/api/auth/reset-password` | 重置密码（令牌） | 否 |
| GET | `/api/auth/verify-email?token=` | 验证邮箱 | 否 |
| GET | `/api/auth/github` | GitHub OAuth 跳转 | 否 |
| GET | `/api/auth/github/callback` | GitHub OAuth 回调 | 否 |
| GET | `/api/auth/google` | Google OAuth 跳转 | 否 |
| GET | `/api/auth/google/callback` | Google OAuth 回调 | 否 |

### 文章 (`/api/posts`)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/posts` | 文章列表（?category=&tag=&search=&authorId=&page=&limit=&status=） | 否 |
| GET | `/api/posts/tags/all` | 标签云 | 否 |
| GET | `/api/posts/:idOrSlug` | 文章详情 | 否 |
| POST | `/api/posts` | 创建文章 | 是 |
| PUT | `/api/posts/:id` | 更新文章（自动保存历史版本） | 是 |
| DELETE | `/api/posts/:id` | 删除文章 | 是 |
| POST | `/api/posts/:id/like` | 点赞/取消（触发通知） | 是 |
| POST | `/api/posts/:id/favorite` | 收藏/取消 | 是 |
| PUT | `/api/posts/:id/pin` | 置顶/取消 | 是 |
| GET | `/api/posts/:id/revisions` | 版本历史列表 | 否 |
| POST | `/api/posts/:id/restore/:revId` | 回滚到指定版本 | 是 |

### 评论 (`/api/comments`)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/comments/post/:postId` | 文章评论列表 | 否 |
| POST | `/api/comments` | 创建评论（含 parentId 嵌套回复） | 是 |
| DELETE | `/api/comments/:id` | 删除评论 | 是 |
| POST | `/api/comments/:id/like` | 评论点赞 | 是 |

### 用户 (`/api/users`)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/users` | 用户列表 | 否 |
| GET | `/api/users/:id` | 用户详情 | 否 |

### 上传 (`/api/upload`)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/upload` | 上传图片（自动生成缩略图 + WebP） | 是 |
| GET | `/api/upload/list` | 图片列表 | 是 |
| DELETE | `/api/upload/:filename` | 删除图片及其缩略图 | 是 |

### 通知 (`/api/notifications`)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/notifications` | 通知列表 | 是 |
| PUT | `/api/notifications/read-all` | 全部标记已读 | 是 |
| PUT | `/api/notifications/:id/read` | 单条标记已读 | 是 |

### 订阅 (`/api/subscribers`)

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/subscribers` | 订阅 | 否 |
| DELETE | `/api/subscribers?email=` | 退订 | 否 |

### 其他

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/health` | 健康检查 | 否 |
| GET | `/api/rss` | RSS 2.0 Feed | 否 |
| GET | `/api/sitemap.txt` | Sitemap | 否 |
| GET | `/api/admin/stats` | 管理统计 | 是 |
| GET | `/api/admin/analytics` | 7 天流量 + 来源 | 是 |
| GET | `/api/subscribers` | 订阅者列表 | 是 |
| GET | `/api/docs` | Swagger UI | 否 |
| GET | `/api/docs.json` | Swagger JSON | 否 |

## 贡献指南

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/你的功能`
3. 提交改动：`git commit -m 'feat: 添加某功能'`
4. 推送到分支：`git push origin feature/你的功能`
5. 发起 Pull Request

提交信息请遵循约定式提交格式（feat / fix / refactor / style / chore）。

## 许可证

MIT License — 详见 [LICENSE](LICENSE) 文件。
