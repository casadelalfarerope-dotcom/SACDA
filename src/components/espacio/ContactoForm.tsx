'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarMiContacto } from '@/app/actions/espacio'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function ContactoForm({ inicial }: { inicial: { telefono: string; email: string; direccion: string } }) {
  const router = useRouter()
  const [datos, setDatos] = useState(inicial)
  const [estado, setEstado] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const cambio = datos.telefono !== inicial.telefono || datos.email !== inicial.email || datos.direccion !== inicial.direccion

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setEstado(null)
    const res = await actualizarMiContacto(datos)
    setGuardando(false)
    if (res.error) { setEstado({ tipo: 'error', texto: res.error }); return }
    setEstado({ tipo: 'ok', texto: 'Tus datos se guardaron.' })
    router.refresh()
  }

  const campo = (k: keyof typeof datos) => ({
    value: datos[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => { setDatos({ ...datos, [k]: e.target.value }); setEstado(null) },
  })

  return (
    <form onSubmit={guardar} className="space-y-4" noValidate>
      <Input label="Teléfono / WhatsApp" type="tel" inputMode="tel" autoComplete="tel" placeholder="+51 999 888 777" {...campo('telefono')} />
      <Input label="Correo electrónico" type="email" autoComplete="email" placeholder="nombre@correo.com" {...campo('email')} />
      <Input label="Dirección" autoComplete="street-address" placeholder="Av. Ejemplo 123, Lima" {...campo('direccion')} />
      {estado && (
        <p role={estado.tipo === 'error' ? 'alert' : 'status'} className="text-[13px]"
          style={{ color: estado.tipo === 'error' ? 'var(--error)' : 'var(--success)' }}>{estado.texto}</p>
      )}
      <Button type="submit" loading={guardando} disabled={!cambio}>Guardar cambios</Button>
    </form>
  )
}
