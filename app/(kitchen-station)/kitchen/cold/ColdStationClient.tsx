'use client'

import { StationPanel } from '@/components/kitchen/StationPanel'

export function ColdStationClient() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: '#1c1917',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <StationPanel station="cold" fullscreen />
    </div>
  )
}
