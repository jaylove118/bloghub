# BlogHub

一个全栈博客平台，基于 React + Vite + Express + MySQL 构建。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + React Router v6 |
| 构建工具 | Vite 5 |
| UI 框架 | TailwindCSS 3 |
| 后端 | Express 4 + Node.js |
| 数据库 | MySQL 8 |
| 认证 | JWT + bcryptjs |
| TypeScript 模块 | 独立 Markdown 解析器 (`src/lib/`) |
| 测试 | Vitest (42 个测试用例通过) |

## 功能特性

- 用户注册/登录（JWT 认证，DiceBear 头像）
- 文章 CRUD（Markdown 支持，分类/标签/封面图）
- 评论系统（嵌套回复、点赞）
- 文章点赞/收藏
- 分类筛选、全文搜索
- 用户主页与个人设置
- 响应式布局（移动端适配）

## 项目结构

```
map/
├── src/
│   ├── components/        # Layout 布局组件
│   ├── context/           # AuthContext (React Context) + api.js (API 调用层)
│   ├── lib/               # 独立 TypeScript 模块 (Markdown 解析器)
│   ├── pages/             # 路由页面 (Home, Login, BlogList, BlogDetail, Editor...)
│   ├── __tests__/         # Vitest 测试文件
│   ├── App.jsx            # 根组件 + 路由定义
│   └── main.jsx           # 入口文件
├── server/
│   ├── src/
│   │   ├── index.js       # Express 服务入口
│   │   ├── config/        # 数据库连接池 + 初始化脚本
│   │   ├── middleware/     # JWT 认证中间件
│   │   └── routes/        # REST API (auth, posts, comments, users)
│   ├── init.sql           # 数据库建表 SQL
│   └── .env               # 环境变量 (数据库连接、JWT 密钥)
├── vite.config.js         # Vite 配置 + API 代理 + Vitest 配置
├── tsconfig.json          # TypeScript 配置
└── package.json           # 前端依赖与脚本
```

## 本地运行

### 前置条件

- **Node.js** >= 18
- **MySQL** >= 8.0 (需要本地运行)

### 1. 初始化数据库

```bash
# 登录 MySQL 并执行建表脚本
mysql -u root -p < server/init.sql

# 或使用项目脚本
cd server
npm run init-db
```

### 2. 配置环境变量

编辑 `server/.env`，填入你的 MySQL 密码：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=bloghub
JWT_SECRET=bloghub_jwt_secret_dev
PORT=3001
```

### 3. 安装依赖

```bash
# 前端依赖
npm install

# 后端依赖
cd server
npm install
cd ..
```

### 4. 启动后端服务器

```bash
cd server
npm run dev
```

服务器将在 `http://localhost:3001` 启动（健康检查: `GET /api/health`）

### 5. 启动前端开发服务器

```bash
# 回到项目根目录
npm run dev
```

前端将在 `http://localhost:5173` 启动。API 请求通过 Vite 代理转发到后端。

### 6. 运行测试

```bash
npm test           # 运行所有测试
npm run test:watch # 监听模式
```

## API 接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 用户注册 | 否 |
| POST | `/api/auth/login` | 用户登录 | 否 |
| GET | `/api/auth/me` | 获取当前用户 | 是 |
| PUT | `/api/auth/profile` | 更新个人资料 | 是 |
| GET | `/api/posts` | 获取文章列表 (支持 ?category, ?tag, ?search, ?authorId) | 否 |
| GET | `/api/posts/:id` | 获取文章详情 | 否 |
| POST | `/api/posts` | 创建文章 | 是 |
| PUT | `/api/posts/:id` | 更新文章 | 是 |
| DELETE | `/api/posts/:id` | 删除文章 | 是 |
| POST | `/api/posts/:id/like` | 点赞/取消点赞 | 是 |
| POST | `/api/posts/:id/favorite` | 收藏/取消收藏 | 是 |
| GET | `/api/comments/post/:postId` | 获取文章评论 | 否 |
| POST | `/api/comments` | 创建评论 | 是 |
| DELETE | `/api/comments/:id` | 删除评论 | 是 |
| POST | `/api/comments/:id/like` | 评论点赞 | 是 |
| GET | `/api/users` | 获取用户列表 | 否 |
| GET | `/api/users/:id` | 获取用户详情 | 否 |
