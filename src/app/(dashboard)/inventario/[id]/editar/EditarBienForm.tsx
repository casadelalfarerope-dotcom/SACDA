'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { editarBien } from '@/app/actions/inventario'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Pagina } from '@/components/ui/ios'

const CATEGORIAS = [
  { value: 'instrumento',  label: 'Instrumento' },
  { value: 'equipo_audio', label: 'Equipo de audio' },
  { value: 'equipo_video', label: 'Equipo de video' },
  { value: 'mobiliario',   label: 'Mobiliario' },
  { value: 'otro',         label: 'Otro' },
]

export default function EditarBienForm({ bien }: { bien: Record<string, unknown> }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const id = bien.id as string
  const sel = { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }

  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const res = await editarBien(id, {
      nombre: fd.get('nombre') as string,
      categoria: fd.get('categoria') as string,
      numero_serie: fd.get('numero_serie') as string,
      fecha_compra: fd.get('fecha_compra') as string,
      vida_util_anios: fd.get('vida_util_anios') as string,
      estado: fd.get('estado') as string,
      descripcion: fd.get('descripcion') as string,
      intervalo_mantenimiento_dias: fd.get('intervalo_mantenimiento_dias') as string,
      proximo_mantenimiento: fd.get('proximo_mantenimiento') as string,
    })
    if (res.error) { setError(res.error); setLoading(false); return }
    router.push(`/inventario/${id}`)
  }

  return (
    <Pagina ancho="estrecho" titulo="Editar bien" volver={{ href: `/inventario/${id}`, texto: 'Bien' }}>
      <form onSubmit={handle} className="space-y-4">
        <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <Input name="nombre" label="Nombre" defaultValue={bien.nombre as string} required />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="editar-editarbi-1" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Categoría</label>
              <select id="editar-editarbi-1" name="categoria" defaultValue={bien.categoria as string}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={sel}>
                <option value="">Sin categoría</option>
                {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="editar-editarbi-2" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Estado</label>
              <select id="editar-editarbi-2" name="estado" defaultValue={bien.estado as string} required
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={sel}>
                <option value="bueno">Bueno</option>
                <option value="regular">Regular</option>
                <option value="malo">Malo</option>
                <option value="baja">De baja</option>
              </select>
            </div>
          </div>
          <Input name="numero_serie" label="Número de serie (opcional)" defaultValue={bien.numero_serie as string ?? ''} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="editar-editarbi-3" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Fecha de compra</label>
              <input id="editar-editarbi-3" name="fecha_compra" type="date" defaultValue={bien.fecha_compra as string ?? ''}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={sel} />
            </div>
            <div>
              <label htmlFor="editar-editarbi-4" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Vida útil (años)</label>
              <input id="editar-editarbi-4" name="vida_util_anios" type="number" min="1" defaultValue={bien.vida_util_anios as string ?? ''}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={sel} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="editar-editarbi-5" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Intervalo mantenimiento (días)</label>
              <input id="editar-editarbi-5" name="intervalo_mantenimiento_dias" type="number" min="1"
                defaultValue={bien.intervalo_mantenimiento_dias as string ?? ''}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={sel} />
            </div>
            <div>
              <label htmlFor="editar-editarbi-6" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Próximo mantenimiento</label>
              <input id="editar-editarbi-6" name="proximo_mantenimiento" type="date"
                defaultValue={bien.proximo_mantenimiento as string ?? ''}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none" style={sel} />
            </div>
          </div>
          <div>
            <label htmlFor="editar-editarbi-7" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--foreground)' }}>Descripción</label>
            <textarea id="editar-editarbi-7" name="descripcion" rows={2} defaultValue={bien.descripcion as string ?? ''}
              className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }} />
          </div>
        </div>
        {error && <p className="text-sm px-1" style={{ color: 'var(--error)' }}>{error}</p>}
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => router.back()}>Cancelar</Button>
          <Button type="submit" className="flex-1" loading={loading}>Guardar cambios</Button>
        </div>
      </form>
    </Pagina>
  )
}
