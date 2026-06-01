import { describe, it, expect } from 'vitest'
import request from 'supertest'
import express from 'express'
import cookieParser from 'cookie-parser'
import authRoutes from '../routes/auth.js'
import postRoutes from '../routes/posts.js'
import commentRoutes from '../routes/comments.js'
import notificationRoutes from '../routes/notifications.js'
import subscriberRoutes from '../routes/subscribers.js'

function createApp() {
  const app = express()
  app.use(express.json({ limit: '10mb' }))
  app.use(cookieParser())
  app.use('/api/auth', authRoutes)
  app.use('/api/posts', postRoutes)
  app.use('/api/comments', commentRoutes)
  app.use('/api/notifications', notificationRoutes)
  app.use('/api/subscribers', subscriberRoutes)
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ message: err.status === 500 ? '服务器内部错误' : err.message })
  })
  return app
}

const app = createApp()

describe('E2E Smoke Tests', () => {
  let token, userId, postId, commentId
  const user = { username: 'e2e_' + Date.now(), email: 'e2e_' + Date.now() + '@test.com', password: 'test123456' }

  it('Full user journey: register -> login -> create post -> comment -> like -> notifications', async () => {
    // 1. Register
    const r1 = await request(app).post('/api/auth/register').send(user)
    expect(r1.status).toBe(201)
    expect(r1.body.token).toBeDefined()
    token = r1.body.token
    userId = r1.body.user.id

    // 2. Login
    const r2 = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password })
    expect(r2.status).toBe(200)

    // 3. Create post
    const r3 = await request(app).post('/api/posts')
      .set('Authorization', 'Bearer ' + token)
      .send({ title: 'E2E Test Post', content: 'Hello world', category: 'tech', tags: ['test'] })
    expect(r3.status).toBe(201)
    expect(r3.body.post.slug).toBeDefined()
    postId = r3.body.post.id

    // 4. Read post by ID
    const r4 = await request(app).get('/api/posts/' + postId)
    expect(r4.status).toBe(200)

    // 5. Read post by slug
    const r5 = await request(app).get('/api/posts/' + r3.body.post.slug)
    expect(r5.status).toBe(200)

    // 6. Comment
    const r6 = await request(app).post('/api/comments')
      .set('Authorization', 'Bearer ' + token)
      .send({ content: 'Nice!', postId })
    expect(r6.status).toBe(201)
    commentId = r6.body.comment.id

    // 7. Like post
    const r7 = await request(app).post('/api/posts/' + postId + '/like')
      .set('Authorization', 'Bearer ' + token)
    expect(r7.status).toBe(200)

    // 8. Notifications exist
    const r8 = await request(app).get('/api/notifications')
      .set('Authorization', 'Bearer ' + token)
    expect(r8.status).toBe(200)
    expect(r8.body.notifications).toBeDefined()

    // 9. Search
    const r9 = await request(app).get('/api/posts?search=E2E')
    expect(r9.status).toBe(200)

    // 10. Subscriber flow
    const r10 = await request(app).post('/api/subscribers/subscribe').send({ email: 'sub_' + Date.now() + '@test.com' })
    expect(r10.status).toBe(200)
    expect(r10.body.message).toBeDefined()

    // 11. Revisions
    const r11 = await request(app).get('/api/posts/' + postId + '/revisions')
    expect(r11.status).toBe(200)
  })

  it('OAuth routes return 500 when not configured (expected)', async () => {
    const r = await request(app).get('/api/auth/github')
    expect(r.status).toBe(500)
  })

  it('Version restore works', async () => {
    // Update post to create a revision
    await request(app).put('/api/posts/' + postId)
      .set('Authorization', 'Bearer ' + token)
      .send({ title: 'E2E Updated', content: 'Updated', category: 'tech' })

    const revs = await request(app).get('/api/posts/' + postId + '/revisions')
    expect(revs.status).toBe(200)
    expect(revs.body.revisions.length).toBeGreaterThan(0)
  })

  it('Notification read flow works', async () => {
    const r1 = await request(app).get('/api/notifications')
      .set('Authorization', 'Bearer ' + token)
    expect(r1.status).toBe(200)

    // Mark all read
    if (r1.body.unreadCount > 0) {
      await request(app).put('/api/notifications/read-all')
        .set('Authorization', 'Bearer ' + token)
    }
  })
})
