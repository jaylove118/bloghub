import { Router } from 'express'
import multer from 'multer'
import { uploadStream, listImages, deleteImage } from '../utils/cloudinary.js'
import { authRequired } from '../middleware/auth.js'
import cloudinary from '../utils/cloudinary.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  },
})

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  },
})

const router = Router()

router.post('/avatar', avatarUpload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: '请选择图片文件' })
  try {
    const result = await uploadStream(req.file.buffer, {
      transformation: [{ width: 300, height: 300, crop: 'fill', format: 'webp', quality: 80 }],
    })
    res.json({ url: result.secure_url })
  } catch {
    res.status(500).json({ message: '头像上传失败' })
  }
})

router.get('/', authRequired, async (_req, res) => {
  try {
    const images = await listImages()
    res.json({ images })
  } catch {
    res.json({ images: [] })
  }
})

router.post('/', authRequired, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: '请选择图片文件' })
  try {
    const result = await uploadStream(req.file.buffer)
    res.json({ url: result.secure_url })
  } catch {
    res.status(500).json({ message: '图片上传失败' })
  }
})

router.delete('/:filename', authRequired, async (req, res) => {
  try {
    await deleteImage(req.params.filename)
    res.json({ success: true })
  } catch {
    res.status(500).json({ message: '删除失败' })
  }
})

export default router
