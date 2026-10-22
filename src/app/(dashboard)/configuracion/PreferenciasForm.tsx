'use client'

import { useState, useEffect } from 'react'
import { Segmentado } from '@/components/ui/ios'

type Tema = 'light' | 'system' | 'dark'

export default function PreferenciasForm() {
  const [tema, setTema] = useState<Tema>('system')

  useEffect(() => {
    try {
      const guardado = localStorage.getItem('tema') as Tema | null
      if (guardado) setTema(guardado)
    } catch { /* almacenamiento no disponible */ }
  }, [])

  function cambiarTema(t: Tema) {
    setTema(t)
    try { localStorage.setItem('tema', t) } catch { /* almacenamiento no disponible */ }
    const root = document.documentElement
    if (t === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', t)
  }

  return (
    <div className="space-y-2">
      <Segmentado etiqueta="Tema de la interfaz" valor={tema} onChange={cambiarTema} ancho
        opciones={[{ valor: 'light', texto: 'Claro' }, { valor: 'system', texto: 'Automático' }, { valor: 'dark', texto: 'Oscuro' }]} />
      <p className="text-[13px] px-1" style={{ color: 'var(--muted)' }}>“Automático” sigue la configuración de tu dispositivo.</p>
    </div>
  )
}
