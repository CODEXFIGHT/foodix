import type { Metadata } from 'next'
import { HotStationClient } from './HotStationClient'

export const metadata: Metadata = {
  title: '🔥 Estación Caliente — FoodIX KDS',
}

export default function HotStationPage() {
  return <HotStationClient />
}
