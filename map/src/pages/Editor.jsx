import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { api, TOKEN_KEY } from '../context/api'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, Eye, Image, X, RotateCcw, Check, FileText, Send, Bold, Italic, Code, Quote, List, Heading, Columns } from 'lucide-react'
import { parseMarkdown } from '../lib/index'
import { categoryOptions } from '../utils/constants'

const DRAFT_KEY = 'bloghub_editor_draft'

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function saveDraft(data) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data))
  } catch {}
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY)
}

export default function Editor() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const isEditing = Boolean(id)

  useEffect(() => {
    document.title = isEditing ? '编辑文章 - BlogHub' : '写文章 - BlogHub'
  }, [isEditing])

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    coverImage: '',
    category: 'tech',
    tags: [],
    status: 'published',
    scheduledAt: ''
  })
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(false)
  const [splitView, setSplitView] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)

  const draftTimerRef = useRef(null)
  const textareaRef = useRef(null)
  const formDataRef = useRef(formData)
  formDataRef.current = formData

  const insertMarkdown = (prefix, suffix = '') => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = formData.content.substring(start, end)
    const newText = formData.content.substring(0, start) + prefix + selected + suffix + formData.content.substring(end)
    handleChange({ content: newText })
    setTimeout(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + prefix.length + selected.length + suffix.length
    }, 0)
  }

  const doSaveDraft = () => {
    const d = formDataRef.current
    if (d.title.trim() || d.content.trim()) {
      saveDraft(d)
      setDraftSaved(true)
      setTimeout(() => setDraftSaved(false), 2000)
    }
  }

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    if (isEditing) {
      const fetchPost = async () => {
        const post = await api.posts.getById(id)
        if (post) {
          setFormData({
            title: post.title,
            content: post.content,
            excerpt: post.excerpt || '',
            coverImage: post.coverImage || '',
            category: post.category,
            tags: post.tags || [],
            status: post.status || 'published',
            scheduledAt: post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : ''
          })
        }
      }
      fetchPost()
    } else {
      const draft = loadDraft()
      if (draft && (draft.title || draft.content)) {
        setShowDraftBanner(true)
      }
    }
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    }
  }, [id, user, isEditing, navigate])

  const handleChange = (updates) => {
    setFormData(prev => {
      const next = { ...prev, ...updates }
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
      draftTimerRef.current = setTimeout(() => {
        if (next.title.trim() || next.content.trim()) {
          saveDraft(next)
          setDraftSaved(true)
          setTimeout(() => setDraftSaved(false), 2000)
        }
      }, 1500)
      return next
    })
  }

  const restoreDraft = () => {
    const draft = loadDraft()
    if (draft) {
      setFormData(draft)
      setShowDraftBanner(false)
    }
  }

  const dismissDraft = () => {
    clearDraft()
    setShowDraftBanner(false)
  }

  const handleAddTag = () => {
    const tag = tagInput.trim()
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 5) {
      handleChange({ tags: [...formData.tags, tag] })
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    handleChange({ tags: formData.tags.filter(t => t !== tagToRemove) })
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageUploading(true)
    try {
      const form = new FormData()
      form.append('image', file)
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + localStorage.getItem(TOKEN_KEY) },
        body: form,
      })
      const data = await res.json()
      if (res.ok) {
        handleChange({ coverImage: data.url })
      } else {
        alert(data.message || '上传失败')
      }
    } catch {
      alert('图片上传失败')
    } finally {
      setImageUploading(false)
    }
  }

  const handleSubmit = async (e, publishStatus) => {
    if (e) e.preventDefault()
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('请填写标题和内容')
      return
    }

    setLoading(true)
    try {
      const postData = {
        ...formData,
        status: publishStatus,
        scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt).toISOString() : null,
        authorId: user.id,
        excerpt: formData.excerpt || formData.content.replace(/[#*`]/g, '').slice(0, 150)
      }

      if (isEditing) {
        await api.posts.update(id, postData)
        navigate(`/blog/${id}`)
      } else {
        const newPost = await api.posts.create(postData)
        clearDraft()
        if (publishStatus === 'published') {
          navigate(`/blog/${newPost.id}`)
        } else {
          navigate(`/editor/${newPost.id}`)
        }
        return
      }
    } catch (error) {
      console.error(error)
      alert('保存失败')
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <header className="sticky top-16 z-30 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to={isEditing ? `/blog/${id}` : '/blogs'}
              className="flex items-center gap-1 text-gray-600 hover:text-primary"
            >
              <ArrowLeft size={18} />
              返回
            </Link>
            <h1 className="font-semibold">{isEditing ? '编辑文章' : '写文章'}</h1>
            {formData.status === 'draft' && (
              <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">草稿</span>
            )}
            {draftSaved && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <Check size={14} />
                已保存
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={doSaveDraft}
                className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 transition"
                title="手动保存草稿到本地"
              >
                <RotateCcw size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (!preview && !splitView) setPreview(true)
                else if (preview && !splitView) { setPreview(false); setSplitView(true) }
                else { setPreview(false); setSplitView(false) }
              }}
              className={`px-4 py-2 rounded-full transition ${
                preview || splitView ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={!preview && !splitView ? '预览' : splitView ? '关闭分屏' : '分屏'}
            >
              {splitView ? <Columns size={18} /> : <Eye size={18} />}
            </button>
            <button
              onClick={(e) => handleSubmit(e, 'draft')}
              disabled={loading}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50 flex items-center gap-2"
            >
              <FileText size={18} />
              存草稿
            </button>
            <button
              onClick={(e) => handleSubmit(e, 'published')}
              disabled={loading}
              className="px-6 py-2 bg-primary text-white rounded-full hover:bg-secondary transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={18} />
                  发布
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {showDraftBanner && (
        <div className="max-w-5xl mx-auto px-4 mt-4">
          <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-3">
              <RotateCcw size={18} className="text-amber-600" />
              <span className="text-sm text-amber-800">检测到未发布的草稿，是否恢复？</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={dismissDraft}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                丢弃
              </button>
              <button
                onClick={restoreDraft}
                className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-secondary transition"
              >
                恢复草稿
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        {preview ? (
          <div className="bg-white rounded-2xl p-8">
            <h1 className="text-3xl font-bold mb-4">{formData.title || '无标题'}</h1>
            <div className="flex items-center gap-4 mb-6">
              <span className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                {categoryOptions.find(c => c.value === formData.category)?.label}
              </span>
              {formData.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded text-sm">#{tag}</span>
              ))}
            </div>
            {formData.coverImage && (
              <img
                src={formData.coverImage}
                alt=""
                className="w-full h-64 object-cover rounded-xl mb-6"
              />
            )}
            <div className="prose" dangerouslySetInnerHTML={{ __html: parseMarkdown(formData.content) }} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange({ title: e.target.value })}
                placeholder="文章标题"
                maxLength={200}
                className="w-full text-3xl font-bold border-0 border-b-2 border-gray-100 focus:border-primary focus:ring-0 p-2"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{formData.title.length}/200</p>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
                <select
                  value={formData.category}
                  onChange={(e) => handleChange({ category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-primary"
                >
                  {categoryOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-auto">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  定时发布（可选）
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => handleChange({ scheduledAt: e.target.value })}
                  min={new Date().toISOString().slice(0, 16)}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-xl focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">封面图</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.coverImage}
                    onChange={(e) => handleChange({ coverImage: e.target.value })}
                    placeholder="输入图片URL或上传"
                    maxLength={2000}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-primary"
                  />
                  <label className={`px-4 py-2 rounded-xl cursor-pointer transition ${imageUploading ? 'bg-gray-300' : 'bg-gray-100 hover:bg-gray-200'}`}>
                    {imageUploading ? (
                      <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Image size={20} />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={imageUploading}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">标签（最多5个）</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-1"
                  >
                    #{tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)}>
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="输入标签后按回车添加"
                  maxLength={30}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-primary"
                  disabled={formData.tags.length >= 5}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
                >
                  添加
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">摘要（可选）</label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => handleChange({ excerpt: e.target.value })}
                placeholder="简要描述文章内容..."
                maxLength={500}
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-primary resize-none"
                rows={2}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{formData.excerpt.length}/500</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">内容（支持 Markdown）</label>
              <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-800 px-2 py-1.5 border-b border-gray-200 dark:border-gray-600 flex items-center gap-1 flex-wrap">
                  <button type="button" onClick={() => insertMarkdown('# ', '')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="标题"><Heading size={16} /></button>
                  <button type="button" onClick={() => insertMarkdown('**', '**')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded font-bold" title="粗体"><Bold size={16} /></button>
                  <button type="button" onClick={() => insertMarkdown('*', '*')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded italic" title="斜体"><Italic size={16} /></button>
                  <button type="button" onClick={() => insertMarkdown('`', '`')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="行内代码"><Code size={16} /></button>
                  <button type="button" onClick={() => insertMarkdown('> ', '')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="引用"><Quote size={16} /></button>
                  <button type="button" onClick={() => insertMarkdown('- ', '')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="列表"><List size={16} /></button>
                  <button type="button" onClick={() => insertMarkdown('[', '](url)')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="链接"><span className="text-xs font-mono">A</span></button>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">点击按钮插入格式，支持选中文本</span>
                </div>
                <div className={`${splitView ? 'flex flex-col md:flex-row' : ''}`}>
                  <textarea
                    ref={textareaRef}
                    value={formData.content}
                    onChange={(e) => handleChange({ content: e.target.value })}
                    placeholder="开始写作..."
                    maxLength={100000}
                    className={`${splitView ? 'w-full md:w-1/2 md:border-r border-b md:border-b-0 border-gray-200 dark:border-gray-600' : 'w-full'} h-96 p-4 focus:outline-none resize-none font-mono bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
                  />
                  {splitView && (
                    <div className="w-full md:w-1/2 h-96 p-4 overflow-y-auto prose bg-gray-50 dark:bg-gray-800" dangerouslySetInnerHTML={{ __html: parseMarkdown(formData.content) || '<p class="text-gray-400">预览将在此显示...</p>' }} />
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1 text-right">{formData.content.length}/100,000</p>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
