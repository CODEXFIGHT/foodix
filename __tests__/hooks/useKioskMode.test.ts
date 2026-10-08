import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKioskMode } from '@/hooks/useKioskMode'
import * as deviceId from '@/lib/deviceId'

vi.mock('@/lib/deviceId', () => ({
  getDeviceType: vi.fn(),
}))

describe('useKioskMode hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return isKiosk true if device type is android', () => {
    vi.spyOn(deviceId, 'getDeviceType').mockReturnValue('android')
    const { result } = renderHook(() => useKioskMode())
    expect(result.current.isKiosk).toBe(true)
  })

  it('should return isKiosk true if device type is tablet', () => {
    vi.spyOn(deviceId, 'getDeviceType').mockReturnValue('tablet')
    const { result } = renderHook(() => useKioskMode())
    expect(result.current.isKiosk).toBe(true)
  })

  it('should return isKiosk false if device type is desktop', () => {
    vi.spyOn(deviceId, 'getDeviceType').mockReturnValue('desktop')
    const { result } = renderHook(() => useKioskMode())
    expect(result.current.isKiosk).toBe(false)
  })

  it('should return isKiosk false if device type is web', () => {
    vi.spyOn(deviceId, 'getDeviceType').mockReturnValue('web')
    const { result } = renderHook(() => useKioskMode())
    expect(result.current.isKiosk).toBe(false)
  })
})
