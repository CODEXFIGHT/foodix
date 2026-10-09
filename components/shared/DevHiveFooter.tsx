import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils/cn'
import { APP_VERSION } from '@/lib/constants/version'

interface CodexFightFooterProps {
  className?: string
}

export function CodexFightFooter({ className }: CodexFightFooterProps = {}) {
  return (
    <footer className={cn('flex flex-col items-center gap-2 py-4 pb-20 lg:pb-4 text-xs text-muted-foreground select-none', className)}>
      <a
        href="https://codexfight.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 font-medium opacity-80 hover:opacity-100 transition-opacity group"
      >
        <Image
          src="https://i.ibb.co/j9vRcWRb/logo-img1.png"
          alt="CodexFight"
          width={18}
          height={18}
          className="shrink-0 rounded-sm group-hover:scale-110 transition-transform"
          unoptimized
        />
        <span className="text-center group-hover:text-foreground transition-colors">
          CodexFight · 2026 · Todos los derechos reservados
        </span>
      </a>
      <span className="font-medium opacity-60 tabular-nums">Food<span className="text-yellow-700 dark:text-yellow-400">IX</span> · {APP_VERSION}</span>
      <div className="flex items-center gap-3 font-medium opacity-70">
        <Link href="/manual" className="hover:opacity-100 hover:underline transition-opacity">Manual</Link>
        <span>·</span>
        <Link href="/privacidad" className="hover:opacity-100 hover:underline transition-opacity">Privacidad</Link>
        <span>·</span>
        <Link href="/terminos" className="hover:opacity-100 hover:underline transition-opacity">Términos</Link>
        <span>·</span>
        <Link href="/cookies" className="hover:opacity-100 hover:underline transition-opacity">Cookies</Link>
      </div>
    </footer>
  )
}
