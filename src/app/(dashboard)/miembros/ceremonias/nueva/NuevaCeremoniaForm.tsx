'use client'
import { hoyLima } from '@/lib/utils'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { crearCeremonia } from '@/app/actions/miembros'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { Pagina } from '@/components/ui/ios'
import BuscadorPersona from '@/components/ui/BuscadorPersona'
import Select from '@/components/ui/Select'

interface Persona { id: string; nombre_completo: string }
interface Participante { persona_id: string; nombre_externo: string; rol_en_ceremonia: string }

export default function NuevaCeremoniaForm({ personas }: { personas: Persona[] }) {
  const router = useRouter()
  const opciones = personas.map((p) => ({ id: p.id, nombre: p.nombre_completo }))
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    tipo: 'bautismo' as 'bautismo' | 'dedicacion' | 'boda',
    fecha: hoyLima(),
    officiante: '',
    descripcion: '',
  })
  const [participantes, setParticipantes] = useState<Participante[]>([
    { persona_id: '', nombre_externo: '', rol_en_ceremonia: '' },
  ])

  function agregarParticipante() {
    setParticipantes((p) => [...p, { persona_id: '', nombre_externo: '', rol_en_ceremonia: '' }])
  }

  function quitarParticipante(i: number) {
    setParticipantes((p) => p.filter((_, idx) => idx !== i))
  }

  function actualizarParticipante(i: number, campo: keyof Participante, valor: string) {
    setParticipantes((p) => p.map((pt, idx) => idx === i ? { ...pt, [campo]: valor } : pt))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const parts = participantes
      .filter((p) => p.rol_en_ceremonia.trim())
      .map((p) => ({
        persona_id: p.persona_id || undefined,
        nombre_externo: p.nombre_externo.trim() || undefined,
        rol_en_ceremonia: p.rol_en_ceremonia.trim(),
      }))
    if (parts.length === 0) { setError('Agrega al menos un participante con rol.'); return }

    startTransition(async () => {
      const res = await crearCeremonia({ ...form, participantes: parts })
      if (res.error) { setError(res.error); return }
      router.push('/miembros/ceremonias')
    })
  }

  return (
    <Pagina ancho="estrecho" titulo="Nueva ceremonia" volver={{ href: '/miembros/ceremonias', texto: 'Ceremonias' }}>
      <form onSubmit={handleSubmit} className="space-y-4 p-5 rounded-2xl border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Tipo <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <Select value={form.tipo} aria-label="Tipo de ceremonia"
            onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value as typeof form.tipo }))}
            options={[{ value: 'bautismo', label: 'Bautismo' }, { value: 'dedicacion', label: 'Dedicación' }, { value: 'boda', label: 'Boda' }]} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Fecha <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <Input
            type="date"
            value={form.fecha}
            onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Oficiante (opcional)
          </label>
          <Input
            placeholder="Nombre del pastor o líder que oficia"
            value={form.officiante}
            onChange={(e) => setForm((p) => ({ ...p, officiante: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
            Descripción (opcional)
          </label>
          <textarea
            rows={2}
            placeholder="Notas adicionales sobre la ceremonia..."
            value={form.descripcion}
            onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl text-sm resize-none outline-none"
            style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
          />
        </div>

        {/* Participantes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              Participantes <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <button type="button" onClick={agregarParticipante}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-opacity hover:opacity-70"
              style={{ color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 9%, transparent)' }}>
              <Plus size={12} /> Agregar
            </button>
          </div>

          <div className="space-y-3">
            {participantes.map((pt, i) => (
              <div key={i} className="p-3 rounded-xl space-y-2"
                style={{ background: 'var(--surface-secondary)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                    Participante {i + 1}
                  </span>
                  {participantes.length > 1 && (
                    <button type="button" onClick={() => quitarParticipante(i)}
                      className="p-1 rounded-lg hover:opacity-70 transition-opacity">
                      <Trash2 size={13} style={{ color: 'var(--error)' }} />
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>
                    Rol en la ceremonia <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <Input
                    placeholder="Ej. bautizado, novio, novia, padre..."
                    value={pt.rol_en_ceremonia}
                    onChange={(e) => actualizarParticipante(i, 'rol_en_ceremonia', e.target.value)}
                  />
                </div>

                <div>
                  <BuscadorPersona label="Miembro de la iglesia (si está en el sistema)" compacto
                    personas={opciones} value={pt.persona_id}
                    onChange={(id) => actualizarParticipante(i, 'persona_id', id)} />
                </div>

                {!pt.persona_id && (
                  <div>
                    <label className="block text-xs mb-1" style={{ color: 'var(--muted)' }}>
                      O nombre externo (si no es miembro)
                    </label>
                    <Input
                      placeholder="Nombre completo del participante externo"
                      value={pt.nombre_externo}
                      onChange={(e) => actualizarParticipante(i, 'nombre_externo', e.target.value)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'color-mix(in srgb, var(--error) 12%, transparent)', color: 'var(--error)' }}>
            {error}
          </p>
        )}

        <Button type="submit" loading={isPending} className="w-full">
          Registrar ceremonia
        </Button>
      </form>
    </Pagina>
  )
}
