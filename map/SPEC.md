# 全功能博客网站规范

## 1. 项目概述

- **项目名称**: BlogHub
- **项目类型**: 全功能博客平台
- **核心功能**: 用户系统、内容管理、社区互动、媒体展示
- **目标用户**: 博客作者和读者

## 2. 技术栈

- **前端框架**: React + Vite
- **样式方案**: TailwindCSS
- **路由**: React Router v6
- **状态管理**: React Context + useReducer
- **数据存储**: MySQL + Express REST API
- **认证**: JWT (jsonwebtoken + bcryptjs)
- **图标**: Lucide React
- **测试**: Vitest

## 3. 功能规范

### 3.1 用户系统
- **注册**: 用户名、邮箱、密码、头像选择 (DiceBear API)
- **登录/登出**: 邮箱+密码登录，JWT 认证
- **个人资料**: 头像、用户名、邮箱、个人简介、GitHub 链接
- **用户列表**: 展示所有用户

### 3.2 内容管理（博客文章）
- **文章列表**: 卡片式展示，支持分页，支持缩略图
- **文章详情**: Markdown渲染，代码高亮
- **创建文章**: 标题、封面图（文件上传）、分类、标签、内容
- **编辑/删除**: 作者可管理自己的文章
- **分类系统**: 技术、生活、随笔
- **标签系统**: 支持多标签
- **搜索**: 按标题/内容搜索

### 3.3 社区互动
- **评论系统**: 文章评论，支持嵌套回复
- **点赞系统**: 文章点赞、评论点赞（SQL原子操作防竞态）
- **收藏功能**: 收藏文章

### 3.4 媒体展示
- **图片上传**: 文章封面图通过文件上传接口存储
- **图片预览**: 实时预览
- **响应式图片**: 适配不同设备

## 4. UI/UX 规范

### 4.1 色彩方案
- **主色**: #3B82F6 (蓝色)
- **次色**: #1E40AF (深蓝)
- **强调色**: #F59E0B (琥珀色)
- **背景色**: #F8FAFC (浅灰白)
- **文字色**: #1E293B (深灰)
- **成功色**: #10B981
- **错误色**: #EF4444

### 4.2 字体
- **标题**: Inter, sans-serif
- **正文**: Inter, sans-serif
- **代码**: JetBrains Mono, monospace

### 4.3 布局
- **最大宽度**: 1280px
- **导航栏**: 固定顶部，高度64px
- **侧边栏**: 可折叠，宽度280px
- **卡片圆角**: 12px
- **间距系统**: 4px基础单位

### 4.4 响应式断点
- **桌面**: >= 1024px
- **平板**: 768px - 1023px
- **手机**: < 768px

## 5. 页面结构

1. **首页** (`/`): 精选文章、分类导航、热门标签
2. **博客列表** (`/blogs`): 所有文章，支持筛选和分页
3. **文章详情** (`/blog/:id`): 完整文章内容、评论区
4. **创建/编辑文章** (`/editor`, `/editor/:id`)
5. **用户登录** (`/login`)
6. **用户注册** (`/register`)
7. **个人资料** (`/profile/:id`)
8. **用户设置** (`/settings`)
9. **关于页面** (`/about`)

## 6. 数据模型

### 6.1 用户 (User)
```typescript
{
  id: number
  username: string
  email: string
  password: string (bcrypt 哈希)
  avatar: string (URL)
  bio: string
  github: string (GitHub 用户名或链接)
  created_at: timestamp
  updated_at: timestamp
}
```

### 6.2 文章 (Post)
```typescript
{
  id: number
  title: string
  content: string (Markdown)
  excerpt: string
  category: 'tech' | 'life' | 'essay'
  cover_image: string (文件路径或URL)
  tags: string[] (JSON)
  author_id: number
  view_count: number
  likes: number[] (用户ID数组, JSON)
  favorites: number[] (用户ID数组, JSON)
  created_at: timestamp
  updated_at: timestamp
}
```

### 6.3 评论 (Comment)
```typescript
{
  id: number
  content: string
  post_id: number
  user_id: number
  parent_id: number | null (嵌套回复)
  likes: number[] (用户ID数组, JSON)
  created_at: timestamp
}
```

## 7. 安全措施

- [x] JWT Bearer Token 认证
- [x] 密码 bcrypt 哈希
- [x] CORS 白名单
- [x] 认证接口速率限制 (15分钟20次)
- [x] Markdown URL 协议过滤 (阻止 javascript:/data:)
- [x] 全局错误处理（500错误不暴露内部信息）
- [x] 点赞/收藏 SQL 原子操作防竞态
- [x] 图片上传类型和大小限制

## 8. 验收标准

- [x] 用户可以注册、登录、登出
- [x] 用户可以查看和编辑个人资料
- [x] 用户可以创建、编辑、删除自己的文章
- [x] 用户可以阅读所有文章
- [x] 用户可以对文章和评论进行点赞
- [x] 用户可以收藏文章
- [x] 用户可以评论和回复
- [x] 支持响应式布局
- [x] 数据持久化到 MySQL 数据库
- [x] 文章列表支持分页
- [x] 封面图支持文件上传
