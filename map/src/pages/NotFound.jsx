import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-600">404</h1>
      <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">页面不存在</p>
      <Link to="/" className="mt-6 text-primary hover:underline">返回首页</Link>
    </div>
  )
}
