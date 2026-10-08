'use client'

import { AdminHeading } from '@/components/superadmin/ui'
import { DeviceCenter } from '@/components/superadmin/devices/DeviceCenter'

export default function DeviceCenterPage() {
  return (
    <div className="space-y-6">
      <AdminHeading
        title="Device Center"
        description="Monitoreo en tiempo real de los dispositivos conectados de todos los establecimientos."
      />
      <DeviceCenter />
    </div>
  )
}
