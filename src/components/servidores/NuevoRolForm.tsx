'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearRolServicio } from '@/app/actions/servidores'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const COLORES = ['#6366f1','#2563eb','#0891b2','#059669','#d97706','#dc2626','#9333ea','#64748b']

export default function NuevoRolForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [requiere, setRequiere] = useState(false)

  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const res = await crearRolServicio({
      nombre: fd.get('nombre') as string,
      descripcion: fd.get('descripcion') as string,
      color,
      requiere_material: requiere,
    })
    if (res.error) { setError(res.error); setLoading(false); return }
    ;(e.target as HTMLFormElement).reset()
    setRequiere(false)
    router.refresh()
    setLoading(false)
  }

  return (
    <form onSubmit={handle} className="space-y-3">
      <Input name="nombre" placeholder="Nombre del rol" required />
      <Input name="descripcion" placeholder="Descripción (opcional)" />
      <div>
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>Color</p>
        <div className="flex gap-2 flex-wrap">
          {COLORES.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full border-2 transition-all"
              style={{ background: c, borderColor: color === c ? 'var(--foreground)' : 'transparent' }}
            />
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={requiere} onChange={(e) => setRequiere(e.target.checked)}
          className="rounded" />
        <span className="text-sm" style={{ color: 'var(--foreground)' }}>Requiere subir material</span>
      </label>
      {error && <p className="text-xs" style={{ color: 'var(--error)' }}>{error}</p>}
      <Button type="submit" size="sm" loading={loading}>Agregar rol</Button>
    </form>
  )
}
