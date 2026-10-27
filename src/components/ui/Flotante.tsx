'use client'

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

// Panel flotante (menús y listas de opciones). Se dibuja sobre el body para que
// el desenfoque del fondo funcione y ningún contenedor lo recorte. Se coloca
// debajo del elemento ancla, o encima si no hay espacio.
export default function Flotante({ ancla, abierto, onCerrar, children, ancho, alinear = 'inicio', className, rol = 'listbox', etiqueta }: {
  ancla: RefObject<HTMLElement | null>
  abierto: boolean
  onCerrar: () => void
  children: ReactNode
  ancho?: number           // por defecto, el ancho del ancla
  alinear?: 'inicio' | 'fin'
  className?: string
  rol?: 'listbox' | 'menu'
  etiqueta?: string
}) {
  const panel = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number } | null>(null)

  useLayoutEffect(() => {
    if (!abierto) { setPos(null); return }
    function colocar() {
      const r = ancla.current?.getBoundingClientRect()
      if (!r) return
      const vw = window.innerWidth, vh = window.innerHeight
      const width = Math.min(ancho ?? r.width, vw - 16)
      let left = alinear === 'fin' ? r.right - width : r.left
      left = Math.max(8, Math.min(left, vw - width - 8))
      const abajo = vh - r.bottom - 12, arriba = r.top - 12
      setPos(abajo >= 220 || abajo >= arriba
        ? { top: r.bottom + 6, left, width, maxHeight: Math.min(320, abajo) }
        : { bottom: vh - r.top + 6, left, width, maxHeight: Math.min(320, arriba) })
    }
    colocar()
    window.addEventListener('resize', colocar)
    window.addEventListener('scroll', colocar, true)
    return () => { window.removeEventListener('resize', colocar); window.removeEventListener('scroll', colocar, true) }
  }, [abierto, ancla, ancho, alinear])

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: PointerEvent) => {
      const t = e.target as Node
      if (!panel.current?.contains(t) && !ancla.current?.contains(t)) onCerrar()
    }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { onCerrar(); ancla.current?.focus() } }
    document.addEventListener('pointerdown', fuera)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', esc) }
  }, [abierto, onCerrar, ancla])

  if (!abierto || !pos) return null
  return createPortal(
    <div ref={panel} role={rol} aria-label={etiqueta}
      className={`material fixed z-[70] rounded-2xl border overflow-y-auto overscroll-contain animate-scale ${className ?? 'p-1.5'}`}
      style={{ ...pos, borderColor: 'var(--border)', boxShadow: 'var(--shadow-float)' }}>
      {children}
    </div>,
    document.body,
  )
}
