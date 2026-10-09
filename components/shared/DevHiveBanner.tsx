'use client'

import { useEffect } from 'react'

const YEAR = new Date().getFullYear()

/**
 * Imprime un banner de propiedad de CodexFight en la consola del
 * navegador y una advertencia de seguridad (anti self-XSS), al estilo de los
 * grandes sitios. No expone lógica de negocio; es informativo/disuasorio.
 */
export function CodexFightBanner() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Evita imprimirlo dos veces (StrictMode / renavegación).
    if ((window as unknown as { __codexfight?: boolean }).__codexfight) return
    ;(window as unknown as { __codexfight?: boolean }).__codexfight = true

    const brand = 'color:#D1400F;font-size:22px;font-weight:800'
    const muted = 'color:#78716c;font-size:12px'
    const warn = 'color:#dc2626;font-size:16px;font-weight:700'

    /* eslint-disable no-console */
    console.log(`%cCodexFight © ${YEAR}`, brand)
    console.log('%chttps://codexfight.com', muted)
    console.log(`%c⚠ Alto`, warn)
    console.log(
      '%cEsta consola es para desarrolladores. Si alguien te pidió pegar algo aquí, es muy probable que sea un fraude para robar tu cuenta. No pegues código que no entiendas.',
      muted,
    )
    /* eslint-enable no-console */
  }, [])

  return null
}
