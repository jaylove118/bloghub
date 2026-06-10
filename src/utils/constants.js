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

// 技术标签
const TECH_TAGS = [
  'React', 'Vue', 'Angular', 'Next.js', 'TypeScript', 'JavaScript',
  'Node.js', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'PHP',
  'Docker', 'Kubernetes', 'AWS', 'Linux', 'Git', 'MySQL', 'Redis',
  'MongoDB', 'GraphQL', 'REST', 'API', 'CSS', 'Tailwind', 'HTML',
  'Flutter', 'Swift', 'Kotlin', 'AI', 'Machine Learning', '前端', '后端',
  '全栈', '开源', '微服务', 'DevOps', 'Webpack', 'Vite', 'Spring',
  'Django', 'FastAPI', 'Laravel', 'Nginx',
]

// 生活标签
const LIFE_TAGS = [
  '旅行', '美食', '摄影', '健身', '读书', '电影', '音乐', '游戏',
  '宠物', '家居', '烹饪', '咖啡', '穿搭', '情感', '育儿', '日常',
  '购物', '数码', '手机', '汽车', '动漫', '运动', '户外', '露营',
  '手账',
]

// 随笔标签
const ESSAY_TAGS = [
  '随笔', '日记', '思考', '人生', '感悟', '成长', '职场', '学习',
  '效率', '时间管理', '心理学', '教育', '设计', '艺术', '创作',
  '写作', '阅读', '灵感', '回忆', '青春', '梦想', '故事', '散文',
  '诗歌', '面试', '理财', '副业',
]

export const POPULAR_TAGS = [...TECH_TAGS, ...LIFE_TAGS, ...ESSAY_TAGS]

export const TAG_CATEGORY_MAP = {
  tech: TECH_TAGS,
  life: LIFE_TAGS,
  essay: ESSAY_TAGS,
}

export const TAG_WHITELIST = new Set(POPULAR_TAGS)
