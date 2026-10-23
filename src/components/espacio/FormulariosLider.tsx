'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import { crearTarea, asignarTarea } from '@/app/actions/tareas'
import { crearTutorialMinisterio } from '@/app/actions/tutoriales'

type Persona = { id: string; nombre: string }

function Estado({ mensaje }: { mensaje: { tipo: 'ok' | 'error'; texto: string } | null }) {
  if (!mensaje) return null
  return (
    <p role={mensaje.tipo === 'error' ? 'alert' : 'status'} className="text-[13px]"
      style={{ color: mensaje.tipo === 'error' ? 'var(--error)' : 'var(--success)' }}>{mensaje.texto}</p>
  )
}

const selectClase = 'w-full h-11 px-3.5 rounded-[10px] text-[15px] outline-none border border-transparent'
const selectEstilo = { background: 'var(--fill)', color: 'var(--foreground)' }

// El líder crea una tarea para alguien de su ministerio.
export function NuevaTareaForm({ grupoId, esDiseno, integrantes, hoy }: { grupoId: string; esDiseno: boolean; integrantes: Persona[]; hoy: string }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [datos, setDatos] = useState({ titulo: '', descripcion: '', asignado_id: '', fecha_limite: '' })
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  return (
    <form className="space-y-3" noValidate onSubmit={(e) => {
      e.preventDefault()
      setMensaje(null)
      if (!datos.titulo.trim()) { setMensaje({ tipo: 'error', texto: 'Escribe el título de la tarea.' }); return }
      iniciar(async () => {
        const res = await crearTarea({ tipo: esDiseno ? 'diseno' : 'otro', grupo_id: grupoId, ...datos })
        if (res.error) { setMensaje({ tipo: 'error', texto: res.error }); return }
        setDatos({ titulo: '', descripcion: '', asignado_id: '', fecha_limite: '' })
        setMensaje({ tipo: 'ok', texto: 'Tarea creada. Le avisamos a la persona asignada.' })
        router.refresh()
      })
    }}>
      <Input label="Tarea *" placeholder={esDiseno ? 'Ej. Flyer de la vigilia' : 'Ej. Preparar el escenario'} maxLength={120}
        value={datos.titulo} onChange={(e) => setDatos({ ...datos, titulo: e.target.value })} />
      <Textarea label="Indicaciones" rows={2} value={datos.descripcion} onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="tarea-asignado" className="block text-[13px] font-medium" style={{ color: 'var(--muted)' }}>Asignar a</label>
          <select id="tarea-asignado" className={selectClase} style={selectEstilo} value={datos.asignado_id}
            onChange={(e) => setDatos({ ...datos, asignado_id: e.target.value })}>
            <option value="">Sin asignar todavía</option>
            {integrantes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <Input label="Fecha límite" type="date" min={hoy} value={datos.fecha_limite} onChange={(e) => setDatos({ ...datos, fecha_limite: e.target.value })} />
      </div>
      <Estado mensaje={mensaje} />
      <Button type="submit" size="sm" loading={pendiente}>Crear tarea</Button>
    </form>
  )
}

// Asignar una tarea que llegó sin responsable (p. ej. un arte de cumpleaños).
export function AsignarTareaForm({ tareaId, integrantes }: { tareaId: string; integrantes: Persona[] }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [persona, setPersona] = useState('')
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <select aria-label="Persona a asignar" className={selectClase} style={selectEstilo} value={persona} onChange={(e) => setPersona(e.target.value)}>
          <option value="">Elige a alguien de tu ministerio…</option>
          {integrantes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <Button loading={pendiente} disabled={!persona} onClick={() => iniciar(async () => {
          const res = await asignarTarea(tareaId, persona)
          setMensaje(res.error ? { tipo: 'error', texto: res.error } : { tipo: 'ok', texto: 'Asignada. Le avisamos a la persona.' })
          router.refresh()
        })}>Asignar</Button>
      </div>
      <Estado mensaje={mensaje} />
    </div>
  )
}

// El líder comparte un tutorial con su ministerio.
export function NuevoTutorialForm({ grupoId }: { grupoId: string }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const [datos, setDatos] = useState({ titulo: '', url_contenido: '', descripcion: '' })
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  return (
    <form className="space-y-3" noValidate onSubmit={(e) => {
      e.preventDefault()
      setMensaje(null)
      iniciar(async () => {
        const res = await crearTutorialMinisterio(grupoId, datos)
        if (res.error) { setMensaje({ tipo: 'error', texto: res.error }); return }
        setDatos({ titulo: '', url_contenido: '', descripcion: '' })
        setMensaje({ tipo: 'ok', texto: 'Tutorial publicado para tu ministerio.' })
        router.refresh()
      })
    }}>
      <Input label="Título *" placeholder="Ej. Cómo usar la consola de sonido" maxLength={120}
        value={datos.titulo} onChange={(e) => setDatos({ ...datos, titulo: e.target.value })} />
      <Input label="Enlace (YouTube, Drive…) *" type="url" inputMode="url" placeholder="https://…"
        value={datos.url_contenido} onChange={(e) => setDatos({ ...datos, url_contenido: e.target.value })} />
      <Textarea label="Descripción" rows={2} value={datos.descripcion} onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })} />
      <Estado mensaje={mensaje} />
      <Button type="submit" size="sm" loading={pendiente}>Publicar tutorial</Button>
    </form>
  )
}
