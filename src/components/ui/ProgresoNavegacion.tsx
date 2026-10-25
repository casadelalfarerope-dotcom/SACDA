'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// Respuesta inmediata al tocar un enlace interno: el enlace queda atenuado y una
// barra de carga aparece bajo el encabezado hasta que la nueva pantalla llega.
// Los toques repetidos sobre el mismo enlace mientras carga se ignoran.
export default function ProgresoNavegacion() {
  const pathname = usePathname()
  const params = useSearchParams()
  const [top, setTop] = useState<number | null>(null)
  const destino = useRef<string | null>(null)
  const pulsado = useRef<HTMLElement | null>(null)

  function terminar() {
    destino.current = null
    pulsado.current?.removeAttribute('data-cargando')
    pulsado.current = null
    setTop(null)
  }

  // La URL cambió: la navegación terminó.
  useEffect(terminar, [pathname, params])

  useEffect(() => {
    let limite: ReturnType<typeof setTimeout> | undefined
    function alPulsar(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a')
      if (!a || !a.href || a.target === '_blank' || a.hasAttribute('download')) return
      const url = new URL(a.href, location.href)
      if (url.origin !== location.origin) return
      const ruta = url.pathname + url.search
      if (ruta === location.pathname + location.search) return
      if (destino.current === ruta) { e.preventDefault(); return } // doble toque
      pulsado.current?.removeAttribute('data-cargando')
      destino.current = ruta
      pulsado.current = a
      a.setAttribute('data-cargando', '')
      const header = document.querySelector('header.material')
      setTop(header ? Math.max(0, header.getBoundingClientRect().bottom) : 0)
      clearTimeout(limite)
      limite = setTimeout(terminar, 12000)
    }
    // Para navegaciones hechas por código (router.push) se avisa con este evento.
    function alNavegar() {
      const header = document.querySelector('header.material')
      setTop(header ? Math.max(0, header.getBoundingClientRect().bottom) : 0)
      clearTimeout(limite)
      limite = setTimeout(terminar, 12000)
    }
    document.addEventListener('click', alPulsar, true)
    window.addEventListener('popstate', terminar)
    window.addEventListener('sacda:navegando', alNavegar)
    return () => {
      document.removeEventListener('click', alPulsar, true)
      window.removeEventListener('popstate', terminar)
      window.removeEventListener('sacda:navegando', alNavegar)
      clearTimeout(limite)
    }
  }, [])

  if (top === null) return null
  return (
    <div role="progressbar" aria-label="Cargando" className="fixed left-0 right-0 z-50 h-[3px] overflow-hidden pointer-events-none" style={{ top }}>
      <div className="h-full rounded-full" style={{ background: 'var(--accent)', width: '60%', animation: 'ui-progress 1.2s ease-in-out infinite' }} />
    </div>
  )
}
