const API_BASE = '/api'
export const TOKEN_KEY = 'bloghub_token'

function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
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

function safeParseJSON(str, fallback = []) {
  if (typeof str !== 'string') return str || fallback
  try { return JSON.parse(str) } catch { return fallback }
}
function normalizeUser(u) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    avatar: u.avatar,
    bio: u.bio,
    github: u.github,
    role: u.role || 'user',
    createdAt: u.created_at,
  }
}

function normalizePost(p) {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug || '',
    content: p.content,
    excerpt: p.excerpt,
    category: p.category,
    coverImage: p.cover_image,
    tags: safeParseJSON(p.tags),
    authorId: p.author_id,
    authorName: p.author_name,
    authorAvatar: p.author_avatar,
    viewCount: p.view_count,
    commentCount: p.comment_count ?? 0,
    isPinned: Boolean(p.is_pinned),
    isProfilePinned: Boolean(p.is_profile_pinned),
    status: p.status || 'published',
    scheduledAt: p.scheduled_at || null,
    likes: safeParseJSON(p.likes),
    favorites: safeParseJSON(p.favorites),
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
    likes: safeParseJSON(c.likes),
    createdAt: c.created_at,
  }
}

export const api = {
  request,

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

    async sendVerifyCode(email) {
      return await request('/auth/send-verify-code', {
        method: 'POST',
        body: JSON.stringify({ email }),
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

    async profilePin(postId) {
      const data = await request('/posts/' + postId + '/profile-pin', { method: 'PUT' })
      return data.isProfilePinned
    },

    async getTags() {
      const data = await request('/posts/tags/all')
      return data.tags
    },

    async getRevisions(postId) {
      const data = await request('/posts/' + postId + '/revisions')
      return data.revisions
    },

    async restoreRevision(postId, revisionId) {
      await request('/posts/' + postId + '/restore/' + revisionId, { method: 'POST' })
    },

    async adminGetAll(filters = {}) {
      const params = new URLSearchParams()
      if (filters.page) params.set('page', filters.page)
      if (filters.limit) params.set('limit', filters.limit)
      const qs = params.toString()
      const data = await request('/admin/posts' + (qs ? '?' + qs : ''))
      return {
        posts: data.posts.map(normalizePost),
        pagination: data.pagination || { page: 1, limit: 20, total: 0 },
      }
    },
  },

  admin: {
    async getUsers(filters = {}) {
      const params = new URLSearchParams()
      if (filters.page) params.set('page', filters.page)
      if (filters.limit) params.set('limit', filters.limit)
      const qs = params.toString()
      return await request('/admin/users' + (qs ? '?' + qs : ''))
    },

    async deleteUser(userId) {
      await request('/admin/users/' + userId, { method: 'DELETE' })
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

  notifications: {
    async getAll() {
      const data = await request('/notifications')
      return data
    },

    async markRead(id) {
      await request('/notifications/' + id + '/read', { method: 'PUT' })
    },

    async markAllRead() {
      await request('/notifications/read-all', { method: 'PUT' })
    },
  },

  subscribers: {
    async subscribe(email) {
      return await request('/subscribers/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
    },

    async unsubscribe(email) {
      return await request('/subscribers/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
    },
  },
}
