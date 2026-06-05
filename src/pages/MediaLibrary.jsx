import { useState, useEffect } from 'react'
import { Trash2, Copy, Image, FileText, X } from 'lucide-react'
import { useSEO } from '../hooks/useSEO'
import LoadingSpinner from '../components/LoadingSpinner'
import { TOKEN_KEY } from '../context/api'

export default function MediaLibrary() {
  useSEO({ title: '媒体库 - BlogHub', description: '管理上传的图片' })
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [uploading, setUploading] = useState(false)

  const fetchImages = async () => {
    try {
      const res = await fetch('/api/upload', {
        headers: { Authorization: 'Bearer ' + localStorage.getItem(TOKEN_KEY) },
      })
      const data = await res.json()
      setImages(data.images || [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchImages() }, [])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const form = new FormData()
    form.append('image', file)
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + localStorage.getItem(TOKEN_KEY) },
        body: form,
      })
      if (res.ok) {
        fetchImages()
      } else {
        const data = await res.json()
        alert(data.message || '上传失败')
      }
    } catch { alert('上传失败') }
    finally { setUploading(false) }
  }

  const handleDelete = async (filename) => {
    if (!window.confirm('确定删除这个文件？')) return
    try {
      const res = await fetch('/api/upload/' + encodeURIComponent(filename), {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + localStorage.getItem(TOKEN_KEY) },
      })
      if (res.ok) {
        fetchImages()
        if (selected?.filename === filename) setSelected(null)
      }
    } catch {}
  }

  const handleCopy = (url) => {
    navigator.clipboard.writeText(url).then(() => alert('链接已复制'))
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold dark:text-white">媒体库</h1>
        <label className={`px-4 py-2 rounded-full cursor-pointer transition text-white ${uploading ? 'bg-gray-400' : 'bg-primary hover:bg-secondary'}`}>
          {uploading ? '上传中...' : '上传图片'}
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {images.length === 0 && !loading && (
          <div className="col-span-full text-center py-16 text-gray-500">
            <Image size={48} className="mx-auto mb-4 opacity-30" />
            <p>还没有上传任何图片</p>
          </div>
        )}
        {images.map((img) => (
          <div
            key={img.filename}
            className={`relative group rounded-xl overflow-hidden border-2 transition cursor-pointer ${
              selected?.filename === img.filename ? 'border-primary' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
            }`}
            onClick={() => setSelected(selected?.filename === img.filename ? null : img)}
          >
            <img src={img.url} alt={img.filename} className="w-full aspect-square object-cover" loading="lazy" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <button
                onClick={(e) => { e.stopPropagation(); handleCopy(img.url) }}
                className="p-2 bg-white rounded-full hover:bg-gray-100 transition"
                title="复制链接"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(img.filename) }}
                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                title="删除"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-8" onClick={() => setSelected(null)}>
          <div className="max-w-3xl max-h-[80vh] bg-white dark:bg-gray-800 rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-mono truncate dark:text-gray-200">{selected.filename}</span>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X size={20} />
              </button>
            </div>
            <img src={selected.url} alt={selected.filename} className="max-h-[60vh] object-contain mx-auto" />
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <button onClick={() => handleCopy(selected.url)} className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-secondary transition">
                复制链接
              </button>
              <button onClick={() => handleDelete(selected.filename)} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition">
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
