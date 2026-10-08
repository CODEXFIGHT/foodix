import { useEffect, useState } from 'react'
import { getDeviceType } from '@/lib/deviceId'

export function useKioskMode() {
  const [isKiosk, setIsKiosk] = useState(false)

  useEffect(() => {
    // Check if the device is Android or tablet to enable Kiosk scale optimizations
    const device = getDeviceType()
    if (device === 'android' || device === 'tablet') {
      setIsKiosk(true)
    }
  }, [])

  return { isKiosk }
}
