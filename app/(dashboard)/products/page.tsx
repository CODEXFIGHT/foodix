'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProductsPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/menu') }, [router])
  return null
}
