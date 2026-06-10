import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export function uploadStream(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'bloghub', resource_type: 'image', ...options },
      (err, result) => err ? reject(err) : resolve(result)
    ).end(buffer)
  })
}

export async function listImages() {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'bloghub/',
      max_results: 100,
    })
    return result.resources.map(r => ({
      filename: r.public_id.replace('bloghub/', ''),
      url: r.secure_url,
      thumbnail: cloudinary.url(r.public_id, { width: 300, crop: 'fill', format: 'webp', quality: 80 }),
      size: r.bytes,
      uploadedAt: r.created_at,
    }))
  } catch {
    return []
  }
}

export async function deleteImage(publicId) {
  return cloudinary.uploader.destroy(`bloghub/${publicId}`)
}

export default cloudinary
