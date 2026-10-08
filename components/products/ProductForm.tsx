'use client'

import { useRouter } from 'next/navigation'

export function ProductForm() {
  const router = useRouter()
  router.replace('/menu')
  return null
}
