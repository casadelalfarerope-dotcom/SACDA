'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { subirMaterial } from '@/app/actions/servidores'
import Button from '@/components/ui/Button'

// El servidor pega el enlace (Drive/OneDrive) del material de su turno.
export default function MaterialTurnoForm({ asignacionId, programaId }: { asignacionId: string; programaId: string }) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!/^https?:\/\/\S+$/.test(url.trim())) { setError('Pega un enlace válido (empieza con https://).'); return }
    setGuardando(true)
    const res = await subirMaterial(asignacionId, url.trim(), programaId)
    setGuardando(false)
    if (res.error) { setError(res.error); return }
    setAbierto(false)
    router.refresh()
  }

  if (!abierto) return <Button size="sm" variant="secondary" onClick={() => setAbierto(true)}>Subir material</Button>

  return (
    <form onSubmit={guardar} className="flex flex-col sm:flex-row gap-2 w-full" noValidate>
      <input value={url} onChange={(e) => { setUrl(e.target.value); setError('') }} aria-label="Enlace del material"
        placeholder="https://drive.google.com/…" autoFocus inputMode="url"
        className="flex-1 min-w-0 h-9 px-3 rounded-[10px] text-[14px] outline-none border border-transparent"
        style={{ background: 'var(--fill)', color: 'var(--foreground)' }} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={guardando}>Guardar</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setAbierto(false)}>Cancelar</Button>
      </div>
      {error && <p role="alert" className="text-[13px] w-full" style={{ color: 'var(--error)' }}>{error}</p>}
    </form>
  )
}
