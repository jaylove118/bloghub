import { describe, it, expect } from 'vitest'

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

describe('normalizeUser', () => {
  const serverUser = {
    id: 1,
    username: 'alice',
    email: 'alice@test.com',
    avatar: 'https://dicebear.com/alice.svg',
    bio: 'Hello world',
    github: 'alice-gh',
    created_at: '2024-01-15T08:00:00.000Z',
  }

  it('maps created_at to createdAt', () => {
    const result = normalizeUser(serverUser)
    expect(result.createdAt).toBe('2024-01-15T08:00:00.000Z')
    expect(result.created_at).toBeUndefined()
  })

  it('preserves primitive fields', () => {
    const result = normalizeUser(serverUser)
    expect(result.id).toBe(1)
    expect(result.username).toBe('alice')
    expect(result.email).toBe('alice@test.com')
    expect(result.avatar).toBe('https://dicebear.com/alice.svg')
    expect(result.bio).toBe('Hello world')
    expect(result.github).toBe('alice-gh')
  })
})

describe('normalizePost', () => {
  const serverPost = {
    id: 10,
    title: 'Test Post',
    content: 'Some content',
    excerpt: 'Excerpt...',
    category: 'tech',
    cover_image: 'https://img.com/cover.png',
    tags: JSON.stringify(['react', 'js']),
    author_id: 1,
    author_name: 'alice',
    author_avatar: 'https://dicebear.com/alice.svg',
    view_count: 42,
    comment_count: 7,
    is_pinned: 1,
    likes: JSON.stringify([1, 2]),
    favorites: JSON.stringify([3]),
    created_at: '2024-06-01T00:00:00.000Z',
    updated_at: '2024-06-02T00:00:00.000Z',
  }

  it('maps snake_case fields to camelCase', () => {
    const result = normalizePost(serverPost)
    expect(result.authorId).toBe(1)
    expect(result.authorName).toBe('alice')
    expect(result.authorAvatar).toBe('https://dicebear.com/alice.svg')
    expect(result.coverImage).toBe('https://img.com/cover.png')
    expect(result.viewCount).toBe(42)
    expect(result.commentCount).toBe(7)
    expect(result.isPinned).toBe(true)
    expect(result.createdAt).toBe('2024-06-01T00:00:00.000Z')
    expect(result.updatedAt).toBe('2024-06-02T00:00:00.000Z')
  })

  it('converts snake_case JSON fields to arrays', () => {
    const result = normalizePost(serverPost)
    expect(result.tags).toEqual(['react', 'js'])
    expect(result.likes).toEqual([1, 2])
    expect(result.favorites).toEqual([3])
  })

  it('handles JSON fields already parsed as arrays', () => {
    const post = {
      ...serverPost,
      tags: ['css'],
      likes: [5],
      favorites: [],
    }
    const result = normalizePost(post)
    expect(result.tags).toEqual(['css'])
    expect(result.likes).toEqual([5])
    expect(result.favorites).toEqual([])
  })

  it('defaults missing array fields to empty arrays', () => {
    const post = { ...serverPost, tags: null, likes: null, favorites: null }
    const result = normalizePost(post)
    expect(result.tags).toEqual([])
    expect(result.likes).toEqual([])
    expect(result.favorites).toEqual([])
  })
})

describe('normalizeComment', () => {
  const serverComment = {
    id: 100,
    content: 'Great post!',
    post_id: 10,
    user_id: 1,
    parent_id: null,
    username: 'alice',
    avatar: 'https://dicebear.com/alice.svg',
    likes: JSON.stringify([2]),
    created_at: '2024-07-01T00:00:00.000Z',
  }

  it('maps snake_case to camelCase', () => {
    const result = normalizeComment(serverComment)
    expect(result.postId).toBe(10)
    expect(result.userId).toBe(1)
    expect(result.parentId).toBeNull()
    expect(result.username).toBe('alice')
    expect(result.avatar).toBe('https://dicebear.com/alice.svg')
    expect(result.createdAt).toBe('2024-07-01T00:00:00.000Z')
  })

  it('parses likes JSON to array', () => {
    const result = normalizeComment(serverComment)
    expect(result.likes).toEqual([2])
  })

  it('defaults likes to empty array when null', () => {
    const comment = { ...serverComment, likes: null }
    const result = normalizeComment(comment)
    expect(result.likes).toEqual([])
  })
})
