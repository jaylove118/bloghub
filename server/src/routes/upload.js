import { Router } from 'express'
import multer from 'multer'
import { extname, join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { randomUUID } from 'crypto'
import { readdirSync, unlinkSync, existsSync, statSync } from 'fs'
import { basename } from 'path'
import { authRequired } from '../middleware/auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const uploadsDir = join(__dirname, '..', '..', 'uploads')

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, randomUUID() + extname(file.originalname)),
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  },
})

const router = Router()

router.get('/', authRequired, (_req, res) => {
  try {
    if (!existsSync(uploadsDir)) return res.json({ images: [] })
    const files = readdirSync(uploadsDir)
    const images = files
      .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
      .map(f => {
        const stat = statSync(join(uploadsDir, f))
        return {
          filename: f,
          url: `/uploads/${f}`,
          size: stat.size,
          uploadedAt: stat.mtime.toISOString(),
        }
      })
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    res.json({ images })
  } catch {
    res.json({ images: [] })
  }
})

router.post('/', authRequired, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '请选择图片文件' })
  }
  const url = `/uploads/${req.file.filename}`

  // Generate thumbnail + WebP (non-blocking)
  try {
    const sharp = (await import('sharp')).default
    const ext = extname(req.file.filename)
    const base = req.file.filename.replace(ext, '')

    // Thumbnail (300px wide WebP)
    await sharp(req.file.path)
      .resize(300, 300, { fit: 'inside' })
      .webp({ quality: 80 })
      .toFile(join(uploadsDir, base + '_thumb.webp'))

    // Full size WebP
    await sharp(req.file.path)
      .webp({ quality: 85 })
      .toFile(join(uploadsDir, base + '.webp'))
  } catch {}

  res.json({ url })
})

router.delete('/:filename', authRequired, (req, res) => {
  const safeFilename = basename(req.params.filename)
  const filepath = join(uploadsDir, safeFilename)
  if (!existsSync(filepath)) {
    return res.status(404).json({ message: '文件不存在' })
  }
  unlinkSync(filepath)
  res.json({ success: true })
})

export default router
