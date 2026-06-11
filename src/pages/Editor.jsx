import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom'
import { api, TOKEN_KEY } from '../context/api'
import { useAuth } from '../context/AuthContext'
import { ArrowLeft, Eye, Image, X, RotateCcw, Check, FileText, Send, Bold, Italic, Code, Quote, List, Heading, Columns, LinkIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { parseMarkdown } from '../lib/index'
import { categoryOptions, POPULAR_TAGS, TAG_CATEGORY_MAP } from '../utils/constants'
import { handleError } from '../utils/errors'
import AIPanel from '../components/AIPanel'
import DOMPurify from 'dompurify'

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

function ToolBtn({ icon, label, onAction, primary }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onAction(); }}
      title={label}
      className={`p-2 rounded-lg transition text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100 ${primary ? 'text-primary hover:text-primary dark:text-primary dark:hover:text-primary' : ''}`}
    >
      {icon}
    </button>
  )
}

export default function Editor() {
  const { id } = useParams()
  const { user, isLoading: authLoading } = useAuth()
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
  const [saveError, setSaveError] = useState(null)
  const [previewLightbox, setPreviewLightbox] = useState(null)
  const [metaOpen, setMetaOpen] = useState(false)
  const [selectedText, setSelectedText] = useState('')

  const draftTimerRef = useRef(null)
  const textareaRef = useRef(null)
  const formDataRef = useRef(formData)
  formDataRef.current = formData
  const insertMarkdown = (prefix, suffix = '') => {
    const ta = textareaRef.current
    if (!ta) return
    ta.focus()
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const content = ta.value

    let actualPrefix = prefix
    if (['# ', '## ', '### ', '- ', '> '].includes(prefix)) {
      if (start > 0 && content[start - 1] !== '\n') {
        actualPrefix = '\n' + prefix
      }
    }

    const selected = content.substring(start, end)
    const newText = content.substring(0, start) + actualPrefix + selected + suffix + content.substring(end)
    handleChange({ content: newText })
    requestAnimationFrame(() => {
      ta.focus()
      const pos = selected
        ? start + actualPrefix.length + selected.length + suffix.length
        : start + actualPrefix.length
      ta.setSelectionRange(pos, pos)
    })
  }

  const handleAIInsert = (text) => {
    const ta = textareaRef.current
    if (!ta) return
    ta.focus()
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const contentVal = ta.value
    const newContent = contentVal.substring(0, start) + text + contentVal.substring(end)
    handleChange({ content: newContent })
    requestAnimationFrame(() => {
      ta.focus()
      const pos = start + text.length
      ta.setSelectionRange(pos, pos)
    })
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
    if (!authLoading && !user) {
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

  const handleContentImage = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files[0]
      if (!file) return
      const form = new FormData()
      form.append('image', file)
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + localStorage.getItem(TOKEN_KEY) },
          body: form,
        })
        const data = await res.json()
        if (res.ok) {
          const ta = textareaRef.current
          if (ta) {
            ta.focus()
            const start = ta.selectionStart
            const content = ta.value
            const imgMd = '\n![图片](' + data.url + ')\n'
            const newContent = content.substring(0, start) + imgMd + content.substring(start)
            handleChange({ content: newContent })
          }
        } else {
          alert(data.message || '上传失败')
        }
      } catch {
        alert('图片上传失败')
      }
    }
    input.click()
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
    } catch (err) {
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
      handleError(error, setSaveError)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) return null
  if (!user) return <Navigate to="/login" />

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <header className="sticky top-16 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to={isEditing ? `/blog/${id}` : '/blogs'}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">返回</span>
            </Link>
            <span className="text-gray-300 dark:text-gray-700">|</span>
            <h1 className="font-semibold text-sm">{isEditing ? '编辑文章' : '写文章'}</h1>
            {formData.status === 'draft' && (
              <span className="px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full font-medium">草稿</span>
            )}
            {draftSaved && (
              <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 animate-fade-in">
                <Check size={14} />已保存
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                type="button"
                onClick={doSaveDraft}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                title="手动保存草稿"
              >
                <RotateCcw size={16} />
              </button>
            )}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              <button type="button" onClick={() => { setPreview(false); setSplitView(false) }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${!preview && !splitView ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                <FileText size={15} />
              </button>
              <button type="button" onClick={() => { setPreview(true); setSplitView(false) }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${preview && !splitView ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                <Eye size={15} />
              </button>
              <button type="button" onClick={() => { setPreview(false); setSplitView(true) }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${splitView ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                <Columns size={15} />
              </button>
            </div>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'draft')}
              disabled={loading}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <FileText size={16} />存草稿
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, 'published')}
              disabled={loading}
              className="px-5 py-2 bg-primary text-white text-sm rounded-lg hover:bg-secondary transition disabled:opacity-50 flex items-center gap-1.5 font-medium shadow-sm"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Send size={16} />发布</>
              )}
            </button>
          </div>
        </div>
      </header>

      {showDraftBanner && (
        <div className="max-w-5xl mx-auto px-4 mt-4">
          <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <div className="flex items-center gap-3">
              <RotateCcw size={18} className="text-amber-600" />
              <span className="text-sm text-amber-800 dark:text-amber-200">检测到未发布的草稿，是否恢复？</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={dismissDraft} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition">丢弃</button>
              <button onClick={restoreDraft} className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-secondary transition">恢复草稿</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6">
        {saveError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-4 flex items-center justify-between">
            <span className="text-sm">{saveError}</span>
            <button onClick={() => setSaveError(null)} className="text-red-400 hover:text-red-600">&times;</button>
          </div>
        )}

        {preview && !splitView ? (
          /* Full preview mode */
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 md:p-12">
            <h1 className="text-3xl font-bold mb-4 dark:text-gray-100">{formData.title || '无标题'}</h1>
            <div className="flex items-center gap-3 mb-6">
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm dark:text-gray-300">
                {categoryOptions.find(c => c.value === formData.category)?.label}
              </span>
              {formData.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-600 dark:text-gray-400">#{tag}</span>
              ))}
            </div>
            {formData.coverImage && (
              <img src={formData.coverImage} alt="" className="w-full max-h-80 object-cover rounded-xl mb-6" />
            )}
            <div className="prose max-w-none dark:text-gray-300"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parseMarkdown(formData.content)) }}
              onClick={(e) => {
                const img = e.target.closest('img')
                if (!img) return
                const link = img.closest('a')
                const src = link?.href || img.src
                if (src?.startsWith('http')) { e.preventDefault(); setPreviewLightbox(src) }
              }}
            />
            {previewLightbox && (
              <div className="lightbox-overlay" onClick={() => setPreviewLightbox(null)}>
                <img src={previewLightbox} alt="" onClick={(e) => e.stopPropagation()} />
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            {/* Title */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange({ title: e.target.value })}
                placeholder="文章标题..."
                maxLength={200}
                className="w-full text-2xl md:text-3xl font-bold border-0 bg-transparent dark:text-gray-100 placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none"
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">{formData.title.length}/200</span>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags.map(tag => (
                  <span key={tag} className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-1.5">
                    #{tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-red-500 transition"><X size={14} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder={formData.tags.length >= 5 ? '最多5个标签' : '输入标签后按回车添加'}
                  maxLength={30}
                  disabled={formData.tags.length >= 5}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl focus:outline-none focus:border-primary text-sm disabled:opacity-50"
                />
                <button type="button" onClick={handleAddTag} disabled={formData.tags.length >= 5}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-sm rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition disabled:opacity-50">
                  添加
                </button>
              </div>
              {formData.tags.length < 5 && (() => {
                const allTags = POPULAR_TAGS.filter(t => !formData.tags.includes(t))
                const catTags = (TAG_CATEGORY_MAP[formData.category] || []).filter(t => !formData.tags.includes(t))
                const otherTags = allTags.filter(t => !catTags.includes(t))
                const suggested = [...catTags, ...otherTags].slice(0, 30)
                return suggested.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="text-xs text-gray-400 mr-1 self-center">推荐:</span>
                    {suggested.map(tag => (
                      <button key={tag} type="button"
                        onClick={() => handleChange({ tags: [...formData.tags, tag] })}
                        className="px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-primary/15 hover:text-primary transition">
                        {tag}
                      </button>
                    ))}
                  </div>
                ) : null
              })()}
            </div>

            {/* Article settings - collapsible */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
              <button type="button"
                onClick={() => setMetaOpen(!metaOpen)}
                className="w-full px-6 py-4 flex items-center justify-between text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                <span className="flex items-center gap-2">
                  <span className="text-base">⚙️</span> 文章设置
                  {(formData.coverImage || formData.excerpt || formData.scheduledAt) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </span>
                {metaOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
              </button>
              {metaOpen && (
                <div className="px-6 pb-6 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-5 animate-slide-up">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">URL Slug</label>
                      <input type="text" value={formData.slug || ''}
                        onChange={(e) => handleChange({ slug: e.target.value })}
                        placeholder="自动生成" maxLength={200}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:border-primary text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">分类</label>
                      <select value={formData.category}
                        onChange={(e) => handleChange({ category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:border-primary text-sm">
                        {categoryOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">定时发布</label>
                      <input type="datetime-local" value={formData.scheduledAt}
                        onChange={(e) => handleChange({ scheduledAt: e.target.value })}
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:border-primary text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">封面图</label>
                      <div className="flex gap-2">
                        <input type="text" value={formData.coverImage}
                          onChange={(e) => handleChange({ coverImage: e.target.value })}
                          placeholder="图片URL或点击上传" maxLength={2000}
                          className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:border-primary text-sm" />
                        <label className={`flex items-center justify-center w-10 h-10 rounded-lg cursor-pointer transition shrink-0 ${imageUploading ? 'bg-gray-200 dark:bg-gray-600' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                          {imageUploading ? <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> : <Image size={18} className="text-gray-500" />}
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={imageUploading} />
                        </label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">摘要</label>
                    <textarea value={formData.excerpt}
                      onChange={(e) => handleChange({ excerpt: e.target.value })}
                      placeholder="简要描述文章内容，留空则自动生成..." maxLength={500} rows={2}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:outline-none focus:border-primary text-sm resize-none" />
                    <p className="text-xs text-gray-400 mt-1 text-right">{formData.excerpt.length}/500</p>
                  </div>
                </div>
              )}
            </div>

            {/* Content editor */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center gap-0.5 px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 overflow-x-auto">
                <div className="flex items-center gap-0.5">
                  <ToolBtn icon={<Heading size={16} />} label="标题 (H1)" onAction={() => insertMarkdown('# ', '')} />
                  <ToolBtn icon={<span className="text-xs font-bold">H2</span>} label="二级标题" onAction={() => insertMarkdown('## ', '')} />
                  <ToolBtn icon={<span className="text-xs font-bold">H3</span>} label="三级标题" onAction={() => insertMarkdown('### ', '')} />
                </div>
                <span className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1.5" />
                <div className="flex items-center gap-0.5">
                  <ToolBtn icon={<Bold size={16} />} label="粗体 (Ctrl+B)" onAction={() => insertMarkdown('**', '**')} />
                  <ToolBtn icon={<Italic size={16} />} label="斜体 (Ctrl+I)" onAction={() => insertMarkdown('*', '*')} />
                  <ToolBtn icon={<Code size={16} />} label="行内代码" onAction={() => insertMarkdown('`', '`')} />
                </div>
                <span className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1.5" />
                <div className="flex items-center gap-0.5">
                  <ToolBtn icon={<Quote size={16} />} label="引用" onAction={() => insertMarkdown('> ', '')} />
                  <ToolBtn icon={<List size={16} />} label="无序列表" onAction={() => insertMarkdown('- ', '')} />
                  <ToolBtn icon={<LinkIcon size={16} />} label="链接" onAction={() => insertMarkdown('[', '](url)')} />
                </div>
                <span className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-1.5" />
                <ToolBtn icon={<Image size={16} />} label="插入图片" onAction={handleContentImage} primary />
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 hidden sm:inline">选中文本后点击按钮包裹格式</span>
              </div>

              <AIPanel
                title={formData.title}
                content={formData.content}
                category={formData.category}
                selectedText={selectedText}
                onInsert={handleAIInsert}
                textareaRef={textareaRef}
              />

              {/* Editor area */}
              <div className={`${splitView ? 'flex flex-col md:flex-row' : ''}`}>
                <textarea
                  ref={textareaRef}
                  value={formData.content}
                  onChange={(e) => handleChange({ content: e.target.value })}
                  onMouseUp={() => {
                    const ta = textareaRef.current
                    if (ta) setSelectedText(ta.value.substring(ta.selectionStart, ta.selectionEnd))
                  }}
                  onKeyUp={() => {
                    const ta = textareaRef.current
                    if (ta) setSelectedText(ta.value.substring(ta.selectionStart, ta.selectionEnd))
                  }}
                  placeholder="开始写作..."
                  maxLength={100000}
                  className={`${splitView ? 'w-full md:w-1/2 md:border-r border-gray-100 dark:border-gray-700' : 'w-full'} h-[500px] p-5 focus:outline-none resize-none font-mono text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder:text-gray-300 dark:placeholder:text-gray-600 leading-relaxed`}
                />
                {splitView && (
                  <div
                    className="w-full md:w-1/2 h-[500px] p-5 overflow-y-auto prose dark:text-gray-300 bg-gray-50 dark:bg-gray-800"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(parseMarkdown(formData.content)) || '<p class="text-gray-400">预览将在此显示...</p>' }}
                    onClick={(e) => {
                      const img = e.target.closest('img')
                      if (!img) return
                      const link = img.closest('a')
                      const src = link?.href || img.src
                      if (src?.startsWith('http')) { e.preventDefault(); setPreviewLightbox(src) }
                    }}
                  />
                )}
              </div>
              <div className="px-5 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span className="text-xs text-gray-400">支持 Markdown 语法</span>
                <span className="text-xs text-gray-400">{formData.content.length.toLocaleString()}/100,000</span>
              </div>
            </div>
          </form>
        )}

        {/* Preview lightbox */}
        {previewLightbox && (
          <div className="lightbox-overlay" onClick={() => setPreviewLightbox(null)}>
            <img src={previewLightbox} alt="" onClick={(e) => e.stopPropagation()} />
          </div>
        )}
      </div>
    </div>
  )
}
