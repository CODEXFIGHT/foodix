'use client'

interface StationEmptyStateProps {
  station: 'hot' | 'cold'
}

export function StationEmptyState({ station }: StationEmptyStateProps) {
  const isHot = station === 'hot'

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4 opacity-40 select-none">
      <span className="text-8xl">{isHot ? '🍳' : '🧊'}</span>
      <p className="text-2xl font-bold text-white">
        {isHot ? 'Cocina al día' : 'Bar al día'}
      </p>
      <p className="text-base" style={{ color: isHot ? '#fcd34d' : '#67e8f9' }}>
        Sin pedidos activos en este momento
      </p>
    </div>
  )
}
