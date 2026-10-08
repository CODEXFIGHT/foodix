'use client'

import { usePathname } from 'next/navigation'

export function PageLoadBlur() {
  const pathname = usePathname()

  return <div key={pathname} className="page-load-blur" aria-hidden="true" />
}
