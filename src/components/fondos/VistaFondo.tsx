import { formatDateShort } from '@/lib/utils'
import { soles, type MovimientoFondo, type SaldoFondo } from '@/lib/fondos'
import { Grupo, Fila } from '@/components/ui/ios'
import Badge from '@/components/ui/Badge'
import { BorrarMovimiento } from './FormulariosFondo'

// Saldo del fondo con su avance hacia la meta (si tiene).
export function ResumenFondo({ saldo, meta }: { saldo: SaldoFondo; meta: number | null }) {
  const avance = meta ? Math.max(0, Math.min(100, Math.round((saldo.saldo / meta) * 100))) : null
  return (
    <section aria-label="Saldo del fondo" className="rounded-2xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Saldo</p>
      <p className="text-[34px] leading-tight font-bold tabular-nums tracking-tight mt-1" style={{ color: saldo.saldo < 0 ? 'var(--error)' : 'var(--foreground)' }}>
        {soles(saldo.saldo)}
      </p>
      {saldo.saldo < 0 && <p className="text-[13px] mt-1" style={{ color: 'var(--error)' }}>El fondo está en negativo: se gastó más de lo que tenía.</p>}
      {meta !== null && avance !== null && (
        <div className="mt-3 space-y-1.5">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--fill)' }} role="progressbar"
            aria-valuenow={avance} aria-valuemin={0} aria-valuemax={100} aria-label="Avance hacia la meta">
            <div className="h-full rounded-full" style={{ width: `${avance}%`, background: 'var(--success)' }} />
          </div>
          <p className="text-[13px]" style={{ color: 'var(--muted)' }}>{avance}% de la meta de {soles(meta)}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t text-[13px]" style={{ borderColor: 'var(--border)' }}>
        <span><span className="block" style={{ color: 'var(--muted)' }}>Entró</span><b className="tabular-nums" style={{ color: 'var(--success)' }}>{soles(saldo.entradas)}</b></span>
        <span><span className="block" style={{ color: 'var(--muted)' }}>Salió</span><b className="tabular-nums" style={{ color: 'var(--foreground)' }}>{soles(saldo.salidas)}</b></span>
      </div>
    </section>
  )
}

// Lista de movimientos. puedeBorrar decide en qué filas aparece la papelera.
export function ListaMovimientos({ movimientos, puedeBorrar, conEnlaces }: {
  movimientos: MovimientoFondo[]
  puedeBorrar: (m: MovimientoFondo) => boolean
  conEnlaces: boolean
}) {
  return (
    <Grupo titulo="Movimientos">
      {movimientos.map((m, i) => (
        <Fila key={m.origen + m.id} primero={i === 0} href={conEnlaces ? m.enlace ?? undefined : undefined}
          titulo={m.concepto}
          subtitulo={[formatDateShort(m.fecha), m.detalle].filter(Boolean).join(' · ')}
          detalle={
            <span className="flex items-center gap-1">
              {m.traspaso && <Badge variant="info">Traspaso</Badge>}
              <span className="font-semibold tabular-nums whitespace-nowrap" style={{ color: m.monto >= 0 ? 'var(--success)' : 'var(--foreground)' }}>
                {m.monto >= 0 ? '+' : '−'}{soles(Math.abs(m.monto))}
              </span>
              {m.origen === 'movimiento' && puedeBorrar(m) && <BorrarMovimiento id={m.id} traspaso={m.traspaso} />}
            </span>
          } />
      ))}
      {!movimientos.length && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>Todavía no hay movimientos</span>} />}
    </Grupo>
  )
}

export function EnlaceFondo({ href, nombre, saldo, meta, ministerio, primero }: {
  href: string; nombre: string; saldo: number; meta: number | null; ministerio: string | null; primero: boolean
}) {
  return (
    <Fila primero={primero} href={href} titulo={nombre}
      subtitulo={[ministerio, meta ? `Meta ${soles(meta)} · ${Math.max(0, Math.round((saldo / meta) * 100))}%` : null].filter(Boolean).join(' · ') || undefined}
      detalle={<span className="font-semibold tabular-nums" style={{ color: saldo < 0 ? 'var(--error)' : 'var(--foreground)' }}>{soles(saldo)}</span>} />
  )
}

