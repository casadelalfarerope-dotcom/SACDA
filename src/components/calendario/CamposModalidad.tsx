'use client'

import Input from '@/components/ui/Input'
import { Segmentado } from '@/components/ui/ios'
import type { DatosModalidad } from '@/lib/modalidad'
export type { DatosModalidad }

export const MODALIDAD_INICIAL: DatosModalidad = { modalidad: 'presencial', enlace_reunion: '', crear_meet: false }

// Presencial, virtual o mixto. Si es virtual: se pega un enlace (Meet, Zoom
// u otro) o, opcionalmente, Google genera uno de Meet.
export default function CamposModalidad({ valor, onChange }: { valor: DatosModalidad; onChange: (v: DatosModalidad) => void }) {
  const set = (cambios: Partial<DatosModalidad>) => onChange({ ...valor, ...cambios })
  const virtual = valor.modalidad !== 'presencial'
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <span className="block text-[13px] font-medium" style={{ color: 'var(--muted)' }}>Modalidad</span>
        <Segmentado etiqueta="Modalidad" ancho valor={valor.modalidad} onChange={(m) => set({ modalidad: m })}
          opciones={[{ valor: 'presencial', texto: 'Presencial' }, { valor: 'virtual', texto: 'Virtual' }, { valor: 'mixto', texto: 'Mixto' }]} />
      </div>
      {virtual && (
        <div className="space-y-3 animate-fade">
          <Input label="Enlace de la reunión" type="url" inputMode="url" value={valor.enlace_reunion}
            disabled={valor.crear_meet} placeholder="https://zoom.us/j/… o https://meet.google.com/…"
            hint="Pega el enlace de Zoom, Meet u otra plataforma."
            onChange={(e) => set({ enlace_reunion: e.target.value })} />
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={valor.crear_meet} className="w-4 h-4 mt-0.5 rounded" style={{ accentColor: 'var(--accent)' }}
              onChange={(e) => set({ crear_meet: e.target.checked, ...(e.target.checked ? { enlace_reunion: '' } : {}) })} />
            <span>
              <span className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Crear un enlace de Google Meet automáticamente</span>
              <span className="block text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                Opcional. Se genera al enviarse a Google Calendar y aparece en el evento.
              </span>
            </span>
          </label>
        </div>
      )}
    </div>
  )
}
