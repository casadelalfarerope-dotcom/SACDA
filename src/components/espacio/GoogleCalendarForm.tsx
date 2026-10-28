'use client'

import { useState, useTransition } from 'react'
import { guardarPreferenciasGoogle } from '@/app/actions/google'
import { TIPOS_GOOGLE } from '@/lib/google-tipos'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

// Cada hermano decide si los eventos le llegan a su Google Calendar y cuáles.
export default function GoogleCalendarForm({ inicial, iglesiaConectada, correoIglesia }: {
  inicial: { activo: boolean; correo: string; tipos: string[] }
  iglesiaConectada: boolean
  correoIglesia: string | null
}) {
  const [activo, setActivo] = useState(inicial.activo)
  const [correo, setCorreo] = useState(inicial.correo)
  const [tipos, setTipos] = useState(new Set(inicial.tipos))
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const [pending, start] = useTransition()

  function guardar(siguienteActivo = activo) {
    setMsg(null)
    start(async () => {
      const res = await guardarPreferenciasGoogle({ activo: siguienteActivo, correo, tipos: [...tipos] })
      if (res.error) { setMsg({ ok: false, texto: res.error }); if (siguienteActivo !== activo) return }
      else setMsg({ ok: true, texto: siguienteActivo ? 'Guardado. En unos minutos verás los eventos en tu Google Calendar.' : 'Listo. Ya no se enviarán eventos a tu Google Calendar.' })
      setActivo(siguienteActivo)
    })
  }

  function alternarTipo(t: string) {
    setTipos((prev) => { const n = new Set(prev); if (n.has(t)) n.delete(t); else n.add(t); return n })
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-3 cursor-pointer">
        <span className="flex-1">
          <span className="block text-[15px] font-medium" style={{ color: 'var(--foreground)' }}>Enviar eventos a mi Google Calendar</span>
          <span className="block text-[13px]" style={{ color: 'var(--muted)' }}>
            Te llegan como invitaciones y Google te avisa con tus propios recordatorios.
          </span>
        </span>
        <button type="button" role="switch" aria-checked={activo} disabled={pending}
          onClick={() => (activo ? guardar(false) : setActivo(true))}
          className="relative w-[51px] h-[31px] rounded-full flex-shrink-0 transition-colors disabled:opacity-50"
          style={{ background: activo ? 'var(--success, #34c759)' : 'var(--fill)' }}>
          <span className="absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow transition-[left]"
            style={{ left: activo ? 22 : 2 }} />
          <span className="sr-only">Enviar eventos a mi Google Calendar</span>
        </button>
      </label>

      {!iglesiaConectada && (
        <p className="text-[13px] rounded-[10px] px-3 py-2" style={{ background: 'var(--fill)', color: 'var(--muted)' }}>
          La iglesia aún no conectó su cuenta de Google. Puedes dejarlo listo: los eventos llegarán cuando Administración lo active.
        </p>
      )}

      {activo && (
        <>
          <Input label="Correo de tu cuenta de Google" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)}
            placeholder="tucorreo@gmail.com" autoComplete="email" />

          <fieldset className="space-y-1">
            <legend className="text-[13px] font-medium mb-1.5" style={{ color: 'var(--muted)' }}>¿Qué eventos quieres recibir?</legend>
            {TIPOS_GOOGLE.map((t) => (
              <label key={t.value} className="flex items-start gap-3 py-2 cursor-pointer">
                <input type="checkbox" checked={tipos.has(t.value)} onChange={() => alternarTipo(t.value)}
                  className="w-[18px] h-[18px] mt-0.5 rounded" style={{ accentColor: 'var(--accent)' }} />
                <span>
                  <span className="block text-[15px]" style={{ color: 'var(--foreground)' }}>{t.label}</span>
                  <span className="block text-[13px]" style={{ color: 'var(--muted)' }}>{t.detalle}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
            Para que los eventos aparezcan solos, agrega {correoIglesia ? <strong>{correoIglesia}</strong> : 'el correo de la iglesia'} a
            tus contactos de Google. Si no aparecen, en Google Calendar ve a Configuración → Eventos de Gmail e invitaciones
            → “Agregar invitaciones a mi calendario” y elige “De todos”.
          </p>

          <div className="flex justify-end">
            <Button type="button" size="sm" loading={pending} onClick={() => guardar(true)}>Guardar</Button>
          </div>
        </>
      )}

      {msg && <p role="status" className="text-[13px]" style={{ color: msg.ok ? 'var(--success)' : 'var(--error)' }}>{msg.texto}</p>}
    </div>
  )
}
