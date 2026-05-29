import { Router } from 'express'
import multer from 'multer'
import { extname, join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { randomUUID } from 'crypto'
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

router.post('/', authRequired, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: '请选择图片文件' })
  }
  const url = `/uploads/${req.file.filename}`
  res.json({ url })
})

export default router
