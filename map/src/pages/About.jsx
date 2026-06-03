import { Link } from 'react-router-dom'
import { Heart, Users, BookOpen } from 'lucide-react'
import { useSEO } from '../hooks/useSEO'

export default function About() {
  useSEO({ title: '关于 - BlogHub', description: 'BlogHub 是一个全功能的博客平台，支持 Markdown 写作和社区互动。' })
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">关于 BlogHub</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">一个全功能的博客平台</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 mb-8">
        <h2 className="text-2xl font-bold mb-4">我们的使命</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          BlogHub 致力于为创作者提供一个简洁、强大且美观的写作平台。我们相信，每个人都有值得分享的故事和知识。
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <BookOpen className="w-10 h-10 text-primary mx-auto mb-3" />
            <h3 className="font-bold mb-2">丰富的内容</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">支持 Markdown，随时随地记录灵感</p>
          </div>
          <div className="text-center p-6 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <Users className="w-10 h-10 text-primary mx-auto mb-3" />
            <h3 className="font-bold mb-2">社区互动</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">点赞、评论、收藏，与读者互动</p>
          </div>
          <div className="text-center p-6 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <Heart className="w-10 h-10 text-primary mx-auto mb-3" />
            <h3 className="font-bold mb-2">精美设计</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">响应式设计，适配所有设备</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-8 text-white text-center">
        <h2 className="text-2xl font-bold mb-4">开始你的创作之旅</h2>
        <p className="mb-6 opacity-90">加入我们，分享你的想法和经验</p>
        <Link
          to="/register"
          className="inline-block px-8 py-3 bg-white dark:bg-gray-800 text-primary font-semibold rounded-full hover:bg-gray-100 transition"
        >
          立即注册
        </Link>
      </div>
    </div>
  )
}
