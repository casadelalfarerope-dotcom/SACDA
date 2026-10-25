'use client'

import { useState } from 'react'
import { Banknote, Smartphone } from 'lucide-react'
import { MEDIOS_DIGITALES, type Medio } from '@/lib/etiquetas'

// ¿Cómo se pagó? Primero físico (efectivo) o digital; si es digital, por cuál
// medio. Controlado (valor/onChange) o suelto con un campo oculto `name`.
export default function SelectorMedio({ valor, onChange, name = 'medio', etiqueta = '¿Cómo se pagó?' }: {
  valor?: Medio
  onChange?: (m: Medio) => void
  name?: string
  etiqueta?: string
}) {
  const [interno, setInterno] = useState<Medio>('efectivo')
  const medio = valor ?? interno
  // El último medio digital elegido se recuerda al alternar con efectivo.
  const [ultimoDigital, setUltimoDigital] = useState<Medio>(medio !== 'efectivo' ? medio : 'yape')
  const cambiar = (m: Medio) => {
    if (m !== 'efectivo') setUltimoDigital(m)
    if (valor === undefined) setInterno(m)
    onChange?.(m)
  }
  const digital = medio !== 'efectivo'

  const boton = (activo: boolean) => ({
    background: activo ? 'var(--surface)' : 'transparent',
    color: activo ? 'var(--foreground)' : 'var(--muted)',
    boxShadow: activo ? '0 1px 3px rgb(0 0 0 / .12)' : undefined,
    fontWeight: activo ? 600 : 500,
  })

  return (
    <fieldset className="space-y-2">
      <legend className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--muted)' }}>{etiqueta}</legend>
      <input type="hidden" name={name} value={medio} />
      <div role="radiogroup" aria-label="Físico o digital" className="grid grid-cols-2 gap-1 p-0.5 rounded-[10px]" style={{ background: 'var(--fill)' }}>
        <button type="button" role="radio" aria-checked={!digital} onClick={() => cambiar('efectivo')}
          className="h-9 rounded-[8px] text-[14px] inline-flex items-center justify-center gap-1.5 transition-all" style={boton(!digital)}>
          <Banknote size={16} aria-hidden="true" /> Efectivo
        </button>
        <button type="button" role="radio" aria-checked={digital} onClick={() => cambiar(ultimoDigital)}
          className="h-9 rounded-[8px] text-[14px] inline-flex items-center justify-center gap-1.5 transition-all" style={boton(digital)}>
          <Smartphone size={16} aria-hidden="true" /> Digital
        </button>
      </div>
      {digital && (
        <div role="radiogroup" aria-label="Medio digital" className="flex flex-wrap gap-1.5">
          {MEDIOS_DIGITALES.map((m) => {
            const activo = medio === m.value
            return (
              <button key={m.value} type="button" role="radio" aria-checked={activo} onClick={() => cambiar(m.value)}
                className="h-8 px-3.5 rounded-full text-[13px] font-medium transition-colors"
                style={activo
                  ? { background: 'var(--accent)', color: 'var(--accent-foreground)' }
                  : { background: 'transparent', color: 'var(--foreground)', boxShadow: 'inset 0 0 0 1.5px var(--border)' }}>
                {m.label}
              </button>
            )
          })}
        </div>
      )}
    </fieldset>
  )
}
