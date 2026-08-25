'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { crearEvento } from '@/app/actions/calendario'

const DIAS_OPCIONES = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']
const DIAS_LABEL: Record<string, string> = {
  lunes:'Lunes', martes:'Martes', miercoles:'Miércoles', jueves:'Jueves',
  viernes:'Viernes', sabado:'Sábado', domingo:'Domingo',
}

export default function NuevoEventoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'evento_unico' as 'servicio' | 'actividad_especial' | 'evento_unico',
    hora_inicio: '',
    hora_fin: '',
    lugar: '',
    tipo_recurrencia: 'ninguna' as 'ninguna' | 'semanal' | 'mensual_por_dia' | 'anual',
    fecha_unica: '',
    fecha_inicio_serie: '',
    dias_semana: [] as string[],
    semana_del_mes: '',
    dia_semana_mes: '',
    requiere_diseno: false,
    dias_aviso_diseno: '7',
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function toggleDia(dia: string) {
    setForm((prev) => ({
      ...prev,
      dias_semana: prev.dias_semana.includes(dia)
        ? prev.dias_semana.filter((d) => d !== dia)
        : [...prev.dias_semana, dia],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await crearEvento({
      ...form,
      semana_del_mes: form.semana_del_mes ? parseInt(form.semana_del_mes) : undefined,
      dias_aviso_diseno: parseInt(form.dias_aviso_diseno) || 7,
    })
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    router.push('/calendario')
    router.refresh()
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/calendario" className="p-2 rounded-xl" style={{ color: 'var(--muted)' }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Nuevo evento</h1>
      </div>

      <form onSubmit={handleSubmit}
        className="rounded-2xl border p-5 md:p-6 space-y-5"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <Input label="Título *" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Ej. Culto de viernes" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Tipo de evento" value={form.tipo} onChange={(e) => set('tipo', e.target.value)}
            options={[
              { value: 'servicio', label: 'Servicio / Culto' },
              { value: 'actividad_especial', label: 'Actividad especial' },
              { value: 'evento_unico', label: 'Evento único' },
            ]} />
          <Select label="Recurrencia" value={form.tipo_recurrencia} onChange={(e) => set('tipo_recurrencia', e.target.value)}
            options={[
              { value: 'ninguna', label: 'Sin recurrencia (fecha única)' },
              { value: 'semanal', label: 'Semanal (ej. viernes y domingo)' },
              { value: 'mensual_por_dia', label: 'Mensual por día (ej. 1er domingo)' },
            ]} />
        </div>

        {/* Fecha única */}
        {form.tipo_recurrencia === 'ninguna' && (
          <Input label="Fecha del evento *" type="date" value={form.fecha_unica} onChange={(e) => set('fecha_unica', e.target.value)} />
        )}

        {/* Semanal */}
        {form.tipo_recurrencia === 'semanal' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>Días de la semana *</label>
              <div className="flex flex-wrap gap-2">
                {DIAS_OPCIONES.map((dia) => (
                  <button key={dia} type="button" onClick={() => toggleDia(dia)}
                    className="px-3 py-1.5 rounded-xl text-sm font-medium border transition-all"
                    style={{
                      background: form.dias_semana.includes(dia) ? 'var(--accent)' : 'var(--surface-secondary)',
                      color: form.dias_semana.includes(dia) ? '#fff' : 'var(--foreground)',
                      borderColor: form.dias_semana.includes(dia) ? 'var(--accent)' : 'var(--border)',
                    }}>
                    {DIAS_LABEL[dia]}
                  </button>
                ))}
              </div>
            </div>
            <Input label="Fecha de inicio de la serie *" type="date" value={form.fecha_inicio_serie} onChange={(e) => set('fecha_inicio_serie', e.target.value)} />
          </div>
        )}

        {/* Mensual por día */}
        {form.tipo_recurrencia === 'mensual_por_dia' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Semana del mes *" value={form.semana_del_mes} onChange={(e) => set('semana_del_mes', e.target.value)}
              placeholder="Seleccionar..."
              options={[
                { value: '1', label: 'Primera' },
                { value: '2', label: 'Segunda' },
                { value: '3', label: 'Tercera' },
                { value: '4', label: 'Cuarta' },
                { value: '-1', label: 'Última' },
              ]} />
            <Select label="Día de la semana *" value={form.dia_semana_mes} onChange={(e) => set('dia_semana_mes', e.target.value)}
              placeholder="Seleccionar..."
              options={DIAS_OPCIONES.map((d) => ({ value: d, label: DIAS_LABEL[d] }))} />
            <Input label="Fecha de inicio de la serie *" type="date" value={form.fecha_inicio_serie} onChange={(e) => set('fecha_inicio_serie', e.target.value)} />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Hora de inicio" type="time" value={form.hora_inicio} onChange={(e) => set('hora_inicio', e.target.value)} />
          <Input label="Hora de fin" type="time" value={form.hora_fin} onChange={(e) => set('hora_fin', e.target.value)} />
        </div>
        <Input label="Lugar" value={form.lugar} onChange={(e) => set('lugar', e.target.value)} placeholder="Ej. Templo principal" />

        {/* Diseño */}
        <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-secondary)' }}>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.requiere_diseno}
              onChange={(e) => setForm((prev) => ({ ...prev, requiere_diseno: e.target.checked }))}
              className="w-4 h-4 rounded"
              style={{ accentColor: 'var(--accent)' }}
            />
            <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
              Este evento requiere diseño gráfico
            </span>
          </label>
          {form.requiere_diseno && (
            <div className="pl-7 animate-fade">
              <label className="block text-xs mb-1.5" style={{ color: 'var(--muted)' }}>
                Avisar al diseñador con cuántos días de anticipación
              </label>
              <select
                value={form.dias_aviso_diseno}
                onChange={(e) => setForm((prev) => ({ ...prev, dias_aviso_diseno: e.target.value }))}
                className="px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                <option value="3">3 días antes</option>
                <option value="5">5 días antes</option>
                <option value="7">7 días antes (recomendado)</option>
                <option value="10">10 días antes</option>
                <option value="14">14 días antes</option>
              </select>
              {form.tipo_recurrencia !== 'ninguna' && (
                <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
                  Para eventos recurrentes, la tarea de diseño se creará manualmente desde cada programa.
                </p>
              )}
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm px-4 py-3 rounded-xl"
            style={{ background: '#ff3b3015', color: 'var(--destructive)' }}>
            {error}
          </p>
        )}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => router.back()} className="flex-1 sm:flex-none">Cancelar</Button>
          <Button type="submit" loading={loading} className="flex-1 sm:flex-none sm:min-w-32">Crear evento</Button>
        </div>
      </form>
    </div>
  )
}
