const LIMITS = {
  username: { min: 1, max: 50 },
  email: { max: 100 },
  password: { min: 6, max: 128 },
  title: { min: 1, max: 200 },
  content: { max: 100000 },
  excerpt: { max: 500 },
  category: { max: 20 },
  tag: { max: 30 },
  tags: { max: 10 },
  bio: { max: 500 },
  commentContent: { min: 1, max: 2000 },
  coverImage: { max: 2000 },
  github: { max: 255 },
}

export function validate(schema) {
  return (req, res, next) => {
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field]
      if (rules.required && (value === undefined || value === null || value === '')) {
        return res.status(400).json({ message: `${field} 不能为空` })
      }
      if (value !== undefined && value !== null && value !== '') {
        if (rules.max && typeof value === 'string' && value.length > rules.max) {
          return res.status(400).json({ message: `${field} 不能超过${rules.max}个字符` })
        }
        if (rules.min && typeof value === 'string' && value.length < rules.min) {
          return res.status(400).json({ message: `${field} 至少需要${rules.min}个字符` })
        }
      }
    }
    next()
  }
}

