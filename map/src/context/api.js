const API_BASE = '/api'
export const TOKEN_KEY = 'bloghub_token'

function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: 'Bearer ' + token } : {}
}

async function request(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || '请求失败')
  }
  return data
}

function normalizeUser(u) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    avatar: u.avatar,
    bio: u.bio,
    github: u.github,
    createdAt: u.created_at,
  }
}

function normalizePost(p) {
  return {
    id: p.id,
    title: p.title,
    content: p.content,
    excerpt: p.excerpt,
    category: p.category,
    coverImage: p.cover_image,
    tags: typeof p.tags === 'string' ? JSON.parse(p.tags) : (p.tags || []),
    authorId: p.author_id,
    authorName: p.author_name,
    authorAvatar: p.author_avatar,
    viewCount: p.view_count,
    commentCount: p.comment_count ?? 0,
    isPinned: Boolean(p.is_pinned),
    status: p.status || 'published',
    likes: typeof p.likes === 'string' ? JSON.parse(p.likes) : (p.likes || []),
    favorites: typeof p.favorites === 'string' ? JSON.parse(p.favorites) : (p.favorites || []),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }
}

function normalizeComment(c) {
  return {
    id: c.id,
    content: c.content,
    postId: c.post_id,
    userId: c.user_id,
    parentId: c.parent_id,
    username: c.username,
    avatar: c.avatar,
    likes: typeof c.likes === 'string' ? JSON.parse(c.likes) : (c.likes || []),
    createdAt: c.created_at,
  }
}

export const api = {
  auth: {
    async register(userData) {
      const data = await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      })
      setToken(data.token)
      return { user: normalizeUser(data.user), token: data.token }
    },

    async login(email, password) {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      setToken(data.token)
      return { user: normalizeUser(data.user), token: data.token }
    },

    async logout() {
      clearToken()
    },

    async getCurrentUser() {
      try {
        const data = await request('/auth/me')
        return normalizeUser(data.user)
      } catch {
        clearToken()
        return null
      }
    },

    async updateProfile(updates) {
      const data = await request('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(updates),
      })
      return normalizeUser(data.user)
    },

    async changePassword(oldPassword, newPassword) {
      await request('/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ oldPassword, newPassword }),
      })
    },
  },

  posts: {
    async getAll(filters = {}) {
      const params = new URLSearchParams()
      if (filters.category) params.set('category', filters.category)
      if (filters.tags) params.set('tags', filters.tags)
      if (filters.search) params.set('search', filters.search)
      if (filters.authorId) params.set('authorId', filters.authorId)
      if (filters.page) params.set('page', filters.page)
      if (filters.limit) params.set('limit', filters.limit)
      const qs = params.toString()
      const data = await request('/posts' + (qs ? '?' + qs : ''))
      return {
        posts: data.posts.map(normalizePost),
        pagination: data.pagination || { page: 1, limit: 12, total: 0 },
      }
    },

    async getById(id) {
      const data = await request('/posts/' + id)
      return normalizePost(data.post)
    },

    async create(postData) {
      const data = await request('/posts', {
        method: 'POST',
        body: JSON.stringify(postData),
      })
      return normalizePost(data.post)
    },

    async update(id, updates) {
      const data = await request('/posts/' + id, {
        method: 'PUT',
        body: JSON.stringify(updates),
      })
      return normalizePost(data.post)
    },

    async delete(id) {
      await request('/posts/' + id, { method: 'DELETE' })
    },

    async like(postId) {
      const data = await request('/posts/' + postId + '/like', { method: 'POST' })
      return data.likes
    },

    async favorite(postId) {
      const data = await request('/posts/' + postId + '/favorite', { method: 'POST' })
      return data.favorites
    },

    async pin(postId) {
      const data = await request('/posts/' + postId + '/pin', { method: 'PUT' })
      return data.isPinned
    },

    async getTags() {
      const data = await request('/posts/tags/all')
      return data.tags
    },
  },

  comments: {
    async getByPostId(postId) {
      const data = await request('/comments/post/' + postId)
      return data.comments.map(normalizeComment)
    },

    async create(commentData) {
      const data = await request('/comments', {
        method: 'POST',
        body: JSON.stringify({
          content: commentData.content,
          postId: commentData.postId,
          parentId: commentData.parentId || null,
        }),
      })
      return normalizeComment(data.comment)
    },

    async delete(id) {
      await request('/comments/' + id, { method: 'DELETE' })
    },

    async like(commentId) {
      const data = await request('/comments/' + commentId + '/like', { method: 'POST' })
      return data.likes
    },
  },

  users: {
    async getAll() {
      const data = await request('/users')
      return data.users.map(normalizeUser)
    },

    async getById(id) {
      try {
        const data = await request('/users/' + id)
        return normalizeUser(data.user)
      } catch {
        return null
      }
    },
  },
}
