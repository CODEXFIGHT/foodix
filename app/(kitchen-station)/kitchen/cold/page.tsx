import type { Metadata } from 'next'
import { ColdStationClient } from './ColdStationClient'

export const metadata: Metadata = {
  title: '🧊 Estación Fría/Bar — FoodIX KDS',
}

export default function ColdStationPage() {
  return <ColdStationClient />
}
