export default function Skeleton({ variant = 'text', className = '' }) {
  switch (variant) {
    case 'card':
      return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl overflow-hidden ${className}`}>
          <div className="aspect-video skeleton !rounded-none" />
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <div className="h-5 w-16 skeleton" />
              <div className="h-5 w-12 skeleton" />
            </div>
            <div className="h-5 w-3/4 skeleton" />
            <div className="h-4 w-full skeleton" />
            <div className="h-4 w-2/3 skeleton" />
            <div className="flex justify-between mt-2">
              <div className="h-4 w-16 skeleton" />
              <div className="h-4 w-20 skeleton" />
            </div>
          </div>
        </div>
      )
    case 'hero':
      return (
        <div className={`bg-white dark:bg-gray-800 rounded-2xl overflow-hidden md:flex ${className}`}>
          <div className="md:w-2/3 aspect-video md:aspect-auto md:h-72 skeleton !rounded-none" />
          <div className="md:w-1/3 p-6 space-y-3">
            <div className="flex gap-2">
              <div className="h-6 w-20 skeleton" />
              <div className="h-6 w-16 skeleton" />
            </div>
            <div className="h-7 w-full skeleton" />
            <div className="h-7 w-3/4 skeleton" />
            <div className="h-4 w-full skeleton" />
            <div className="h-4 w-5/6 skeleton" />
            <div className="h-4 w-1/2 skeleton" />
            <div className="flex gap-6">
              <div className="h-4 w-24 skeleton" />
              <div className="h-4 w-16 skeleton" />
            </div>
          </div>
        </div>
      )
    case 'list':
      return (
        <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 space-y-3 ${className}`}>
          <div className="flex items-center gap-2">
            <div className="h-5 w-16 skeleton" />
            <div className="h-5 w-12 skeleton" />
          </div>
          <div className="h-5 w-4/5 skeleton" />
          <div className="h-4 w-full skeleton" />
          <div className="h-4 w-2/3 skeleton" />
          <div className="flex items-center gap-4">
            <div className="h-4 w-20 skeleton" />
            <div className="h-4 w-16 skeleton" />
            <div className="h-4 w-16 skeleton" />
          </div>
        </div>
      )
    default:
      return <div className={`h-4 skeleton rounded ${className}`} />
  }
}
