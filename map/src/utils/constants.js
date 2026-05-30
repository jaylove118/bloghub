export const avatarTypes = [
  'adventurer', 'adventurer-neutral', 'avataaars', 'big-ears', 'big-smile',
  'bottts', 'croodles', 'fun-emoji', 'icons', 'identicon', 'initials',
  'lorelei', 'micah', 'miniavs', 'open-peeps', 'personas', 'pixel-art'
]

export const categoryMap = {
  tech: { name: '技术', icon: '💻', color: 'bg-blue-100 text-blue-700' },
  life: { name: '生活', icon: '🌿', color: 'bg-green-100 text-green-700' },
  essay: { name: '随笔', icon: '✍️', color: 'bg-amber-100 text-amber-700' },
}

export const categoryOptions = [
  { value: 'tech', label: '💻 技术' },
  { value: 'life', label: '🌿 生活' },
  { value: 'essay', label: '✍️ 随笔' },
]

export function formatDate(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export function formatFullDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function readingTime(content) {
  if (!content) return 1
  const text = content.replace(/[#*`\-\>\[\]!\(\)]/g, '')
  const charsPerMinute = 400
  const minutes = Math.ceil(text.length / charsPerMinute)
  return Math.max(1, minutes)
}
