export default function CoverPlaceholder({ title = '', className = '' }) {
  const colors = [
    ['#3B82F6', '#1E40AF'],
    ['#10B981', '#065F46'],
    ['#F59E0B', '#B45309'],
    ['#8B5CF6', '#5B21B6'],
    ['#EC4899', '#9D174D'],
    ['#6366F1', '#3730A3'],
  ]
  const idx = title ? title.split('').reduce((s, c) => s + c.charCodeAt(0), 0) % colors.length : 0
  const [from, to] = colors[idx]

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <span className="text-white/60 text-4xl font-bold select-none">
        {title ? title.slice(0, 2).toUpperCase() : 'BH'}
      </span>
    </div>
  )
}
