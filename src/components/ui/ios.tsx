import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// Componentes de diseño compartidos, inspirados en las guías de Apple (HIG).

export function Pagina({ titulo, subtitulo, volver, acciones, children, ancho = 'normal' }: {
  titulo?: React.ReactNode
  subtitulo?: React.ReactNode
  volver?: { href: string; texto: string }
  acciones?: React.ReactNode
  children: React.ReactNode
  ancho?: 'estrecho' | 'normal' | 'amplio'
}) {
  const max = ancho === 'estrecho' ? 'max-w-2xl' : ancho === 'amplio' ? 'max-w-6xl' : 'max-w-4xl'
  return (
    <div className={cn('px-4 md:px-8 py-6 mx-auto space-y-7', max)}>
      <header className="space-y-1">
        {volver && (
          <Link href={volver.href} className="inline-flex items-center -ml-1.5 text-[15px] hover:opacity-70" style={{ color: 'var(--accent)' }}>
            <ChevronLeft size={20} aria-hidden="true" />{volver.texto}
          </Link>
        )}
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div className="min-w-0 max-w-full">
            {titulo && <h1 className="truncate" style={{ color: 'var(--foreground)' }}>{titulo}</h1>}
            {subtitulo && <p className="text-[15px] mt-1" style={{ color: 'var(--muted)' }}>{subtitulo}</p>}
          </div>
          {acciones && <div className="flex items-center gap-2 flex-shrink-0 ml-auto">{acciones}</div>}
        </div>
      </header>
      {children}
    </div>
  )
}

// Lista agrupada (inset grouped) con encabezado y nota al pie, como en Ajustes de iOS.
export function Grupo({ titulo, accion, pie, children, className }: {
  titulo?: React.ReactNode
  accion?: React.ReactNode
  pie?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('space-y-1.5', className)}>
      {(titulo || accion) && (
        <div className="flex items-end justify-between gap-3 px-4">
          {titulo && <h2 className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{titulo}</h2>}
          {accion}
        </div>
      )}
      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <ul className="divide-y-0">{children}</ul>
      </div>
      {pie && <p className="px-4 text-[13px]" style={{ color: 'var(--muted)' }}>{pie}</p>}
    </section>
  )
}

// Fila de lista: elemento inicial, título, subtítulo, detalle a la derecha y flecha si navega.
export function Fila({ href, inicio, titulo, subtitulo, detalle, primero = false, destacado = false, children }: {
  href?: string
  inicio?: React.ReactNode
  titulo?: React.ReactNode
  subtitulo?: React.ReactNode
  detalle?: React.ReactNode
  primero?: boolean
  destacado?: boolean
  children?: React.ReactNode
}) {
  const contenido = (
    <>
      {inicio && <span className="flex-shrink-0 py-2.5">{inicio}</span>}
      <span className={cn('flex-1 min-w-0 flex items-center gap-3 min-h-[44px] py-2.5 pr-4', !primero && 'border-t')}
        style={{ borderColor: 'var(--border)' }}>
        <span className="flex-1 min-w-0">
          {titulo && (
            <span className="block text-[15px] truncate" style={{ color: destacado ? 'var(--accent)' : 'var(--foreground)', fontWeight: destacado ? 600 : 450 }}>
              {titulo}
            </span>
          )}
          {subtitulo && <span className="block text-[13px] truncate mt-0.5" style={{ color: 'var(--muted)' }}>{subtitulo}</span>}
          {children}
        </span>
        {detalle && <span className="flex-shrink-0 text-[15px]" style={{ color: 'var(--muted)' }}>{detalle}</span>}
        {href && <ChevronRight size={17} aria-hidden="true" className="flex-shrink-0" style={{ color: 'var(--muted)', opacity: 0.55 }} />}
      </span>
    </>
  )
  return (
    <li>
      {href ? (
        <Link href={href} className="flex items-center gap-3 pl-4 transition-colors hover:bg-[color:var(--fill)] active:bg-[color:var(--fill)]">
          {contenido}
        </Link>
      ) : (
        <div className="flex items-center gap-3 pl-4">{contenido}</div>
      )}
    </li>
  )
}

// Tarjeta simple con relleno.
export function Tarjeta({ children, className, titulo }: { children: React.ReactNode; className?: string; titulo?: React.ReactNode }) {
  return (
    <section className={cn('rounded-2xl border p-5 space-y-4', className)} style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      {titulo && <h2 className="text-[17px] font-semibold" style={{ color: 'var(--foreground)' }}>{titulo}</h2>}
      {children}
    </section>
  )
}

// Control segmentado con enlaces (sirve en páginas de servidor).
export function SegmentadoEnlaces({ opciones, actual, etiqueta }: {
  opciones: { valor: string; texto: string; href: string }[]
  actual: string
  etiqueta: string
}) {
  return (
    <nav aria-label={etiqueta} className="inline-flex max-w-full overflow-x-auto p-0.5 rounded-[10px] gap-0.5" style={{ background: 'var(--fill)' }}>
      {opciones.map((o) => {
        const activo = o.valor === actual
        return (
          <Link key={o.valor} href={o.href} aria-current={activo ? 'page' : undefined}
            className="px-3.5 py-1.5 rounded-[8px] text-[13px] font-semibold whitespace-nowrap transition-all"
            style={{
              background: activo ? 'var(--surface)' : 'transparent',
              color: 'var(--foreground)',
              boxShadow: activo ? '0 1px 3px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.04)' : undefined,
              opacity: activo ? 1 : 0.75,
            }}>
            {o.texto}
          </Link>
        )
      })}
    </nav>
  )
}

// Enlace con aspecto de botón cápsula.
export function BotonEnlace({ href, children, variante = 'primario', etiqueta }: {
  href: string; children: React.ReactNode; variante?: 'primario' | 'tintado'; etiqueta?: string
}) {
  return (
    <Link href={href} aria-label={etiqueta}
      className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full text-[14px] font-semibold whitespace-nowrap transition-[filter,transform] hover:brightness-[1.06] active:scale-[0.97]"
      style={variante === 'primario'
        ? { background: 'var(--accent)', color: 'var(--accent-foreground)' }
        : { background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
      {children}
    </Link>
  )
}

export function Vacio({ titulo, texto, icono }: { titulo: string; texto?: string; icono?: React.ReactNode }) {
  return (
    <div className="text-center py-14 px-6 space-y-2">
      {icono && <div className="flex justify-center mb-3" style={{ color: 'var(--muted)', opacity: 0.5 }}>{icono}</div>}
      <p className="text-[17px] font-semibold" style={{ color: 'var(--foreground)' }}>{titulo}</p>
      {texto && <p className="text-[15px]" style={{ color: 'var(--muted)' }}>{texto}</p>}
    </div>
  )
}

// Control segmentado con botones (para componentes de cliente).
export function Segmentado<T extends string>({ opciones, valor, onChange, etiqueta, ancho = false }: {
  opciones: { valor: T; texto: string }[]
  valor: T
  onChange: (v: T) => void
  etiqueta: string
  ancho?: boolean
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta}
      className={cn('max-w-full overflow-x-auto p-0.5 rounded-[10px] gap-0.5', ancho ? 'flex' : 'inline-flex')}
      style={{ background: 'var(--fill)' }}>
      {opciones.map((o) => {
        const activo = o.valor === valor
        return (
          <button key={o.valor} type="button" role="radio" aria-checked={activo} onClick={() => onChange(o.valor)}
            className={cn('py-1.5 rounded-[8px] font-semibold whitespace-nowrap transition-all', ancho ? 'flex-1 px-1 text-[12px] sm:text-[13px]' : 'px-3.5 text-[13px]')}
            style={{
              background: activo ? 'var(--surface)' : 'transparent',
              color: 'var(--foreground)',
              boxShadow: activo ? '0 1px 3px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.04)' : undefined,
              opacity: activo ? 1 : 0.75,
            }}>
            {o.texto}
          </button>
        )
      })}
    </div>
  )
}
