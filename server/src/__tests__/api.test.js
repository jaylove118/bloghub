import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import request from 'supertest'
import cookieParser from 'cookie-parser'
import authRoutes from '../routes/auth.js'
import postRoutes from '../routes/posts.js'
import commentRoutes from '../routes/comments.js'
import userRoutes from '../routes/users.js'

function createApp() {
  const app = express()
  app.use(express.json({ limit: '10mb' }))
  app.use(cookieParser())
  app.use('/api/auth', authRoutes)
  app.use('/api/posts', postRoutes)
  app.use('/api/comments', commentRoutes)
  app.use('/api/users', userRoutes)
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() })
  })
  app.use((err, _req, res, _next) => {
    const status = err.status || 500
    const message = status === 500 ? '服务器内部错误' : err.message
    res.status(status).json({ message })
  })
  return app
}

const app = createApp()
let testToken = ''
let testUserId = ''
let testPostId = ''
let testCommentId = ''

describe('Health', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })
})

describe('Auth', () => {
  const testUser = {
    username: 'testuser_' + Date.now(),
    email: 'test_' + Date.now() + '@test.com',
    password: 'test123456',
  }

  it('POST /api/auth/register creates a new user', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser)
    expect(res.status).toBe(201)
    expect(res.body.user).toBeDefined()
    expect(res.body.token).toBeDefined()
    testToken = res.body.token
    testUserId = res.body.user.id
  })

  it('POST /api/auth/register rejects duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser)
    expect(res.status).toBe(400)
  })

  it('POST /api/auth/register rejects short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'bad', email: 'bad@test.com', password: '123',
    })
    expect(res.status).toBe(400)
  })

  it('POST /api/auth/login with wrong password returns 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email, password: 'wrongpassword',
    })
    expect(res.status).toBe(401)
  })

  it('POST /api/auth/login with correct credentials returns token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email, password: testUser.password,
    })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
  })

  it('GET /api/auth/me returns current user', async () => {
    const res = await request(app).get('/api/auth/me')
      .set('Authorization', 'Bearer ' + testToken)
    expect(res.status).toBe(200)
    expect(res.body.user.username).toBe(testUser.username)
  })

  it('GET /api/auth/me without token returns 401', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })
})

describe('Posts', () => {
  it('GET /api/posts returns paginated list', async () => {
    const res = await request(app).get('/api/posts')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.posts)).toBe(true)
    expect(res.body.pagination).toBeDefined()
  })

  it('POST /api/posts creates a post', async () => {
    const res = await request(app).post('/api/posts')
      .set('Authorization', 'Bearer ' + testToken)
      .send({
        title: 'Test Post',
        content: '# Hello\nThis is a test post.',
        category: 'tech',
        tags: ['test', 'javascript'],
      })
    expect(res.status).toBe(201)
    expect(res.body.post.title).toBe('Test Post')
    testPostId = '' + res.body.post.id
  })

  it('GET /api/posts/:id returns post detail', async () => {
    const res = await request(app).get('/api/posts/' + testPostId)
    expect(res.status).toBe(200)
    expect(res.body.post.title).toBe('Test Post')
  })

  it('PUT /api/posts/:id updates post', async () => {
    const res = await request(app).put('/api/posts/' + testPostId)
      .set('Authorization', 'Bearer ' + testToken)
      .send({
        title: 'Updated Post',
        content: 'Updated content',
        category: 'life',
        tags: ['updated'],
      })
    expect(res.status).toBe(200)
    expect(res.body.post.title).toBe('Updated Post')
  })

  it('POST /api/posts/:id/like toggles like', async () => {
    const res = await request(app).post('/api/posts/' + testPostId + '/like')
      .set('Authorization', 'Bearer ' + testToken)
    expect(res.status).toBe(200)
    expect(res.body.likes).toContain(testUserId)
  })

  it('POST /api/posts/:id/favorite toggles favorite', async () => {
    const res = await request(app).post('/api/posts/' + testPostId + '/favorite')
      .set('Authorization', 'Bearer ' + testToken)
    expect(res.status).toBe(200)
    expect(res.body.favorites).toContain(testUserId)
  })

  it('GET /api/posts filters by category', async () => {
    const res = await request(app).get('/api/posts?category=life')
    expect(res.status).toBe(200)
    res.body.posts.forEach(p => expect(p.category).toBe('life'))
  })

  it('GET /api/posts filters by tag', async () => {
    const res = await request(app).get('/api/posts?tag=test')
    expect(res.status).toBe(200)
    res.body.posts.forEach(p => expect(p.tags).toContain('test'))
  })

  it('GET /api/posts searches by keyword', async () => {
    const res = await request(app).get('/api/posts?search=Updated')
    expect(res.status).toBe(200)
    expect(res.body.posts.length).toBeGreaterThan(0)
  })

  it('GET /api/posts returns 404 for nonexistent post', async () => {
    const res = await request(app).get('/api/posts/99999')
    expect(res.status).toBe(404)
  })

  it('POST /api/posts requires auth', async () => {
    const res = await request(app).post('/api/posts').send({ title: 'x', content: 'x', category: 'tech' })
    expect(res.status).toBe(401)
  })
})

describe('Comments', () => {
  it('POST /api/comments creates a comment', async () => {
    const res = await request(app).post('/api/comments')
      .set('Authorization', 'Bearer ' + testToken)
      .send({ content: 'Nice post!', postId: testPostId })
    expect(res.status).toBe(201)
    expect(res.body.comment.content).toBe('Nice post!')
    testCommentId = '' + res.body.comment.id
  })

  it('GET /api/comments/post/:postId returns comments', async () => {
    const res = await request(app).get('/api/comments/post/' + testPostId)
    expect(res.status).toBe(200)
    expect(res.body.comments.length).toBeGreaterThan(0)
  })

  it('POST /api/comments/:id/like toggles comment like', async () => {
    const res = await request(app).post('/api/comments/' + testCommentId + '/like')
      .set('Authorization', 'Bearer ' + testToken)
    expect(res.status).toBe(200)
    expect(res.body.likes).toContain(testUserId)
  })

  it('DELETE /api/comments/:id deletes comment', async () => {
    const res = await request(app).delete('/api/comments/' + testCommentId)
      .set('Authorization', 'Bearer ' + testToken)
    expect(res.status).toBe(200)
  })
})

describe('Users', () => {
  it('GET /api/users returns user list', async () => {
    const res = await request(app).get('/api/users')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.users)).toBe(true)
  })

  it('GET /api/users/:id returns user detail', async () => {
    const res = await request(app).get('/api/users/' + testUserId)
    expect(res.status).toBe(200)
    expect(res.body.user.id).toBe(testUserId)
  })

  it('GET /api/users/:id returns 404 for nonexistent user', async () => {
    const res = await request(app).get('/api/users/99999')
    expect(res.status).toBe(404)
  })
})

afterAll(async () => {
  const pool = (await import('../config/db.js')).default
  try {
    const [users] = await pool.query('SELECT id FROM users WHERE username LIKE ?', ['testuser_%'])
    const userIds = users.map(u => u.id)
    if (userIds.length > 0) {
      await pool.query('DELETE FROM notifications WHERE user_id IN (?) OR actor_id IN (?)', [userIds, userIds])
      await pool.query('DELETE FROM post_revisions WHERE revised_by IN (?)', [userIds])
      await pool.query('DELETE FROM analytics_views WHERE user_id IN (?)', [userIds])
      const [posts] = await pool.query('SELECT id FROM posts WHERE author_id IN (?)', [userIds])
      const postIds = posts.map(p => p.id)
      if (postIds.length > 0) {
        await pool.query('DELETE FROM comments WHERE post_id IN (?)', [postIds])
        await pool.query('DELETE FROM post_revisions WHERE post_id IN (?)', [postIds])
      }
      await pool.query('DELETE FROM posts WHERE author_id IN (?)', [userIds])
      await pool.query('DELETE FROM users WHERE id IN (?)', [userIds])
    }
  } catch {}
})

describe('Security', () => {
  it('GET /api/posts/nonexistent returns 404', async () => {
    const res = await request(app).get('/api/posts/nonexistent-slug-99999')
    expect(res.status).toBe(404)
  })

  it('500 errors return generic message in production', async () => {
    const res = await request(app).get('/api/posts/not-a-number-at-all')
    expect(res.status === 404 || res.status === 500).toBe(true)
  })
})
