'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { activarGoogleParaTodos, desconectarGoogle, sincronizarGoogleAhora } from '@/app/actions/google'
import Button from '@/components/ui/Button'

// Administración: conectar la cuenta de Google de la iglesia, sincronizar o desconectar.
export default function ConexionGoogle({ conectada }: { conectada: boolean }) {
  const router = useRouter()
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const [pending, start] = useTransition()

  const accion = <R extends { error?: string }>(fn: () => Promise<R>, ok: string | ((r: R) => string)) => start(async () => {
    setMsg(null)
    const res = await fn()
    setMsg(res.error ? { ok: false, texto: res.error } : { ok: true, texto: typeof ok === 'string' ? ok : ok(res) })
    router.refresh()
  })

  return (
    <div className="space-y-2 py-1">
      <div className="flex flex-wrap gap-2">
        {conectada ? (
          <>
            <Button type="button" size="sm" loading={pending} onClick={() => accion(sincronizarGoogleAhora, 'Sincronizado.')}>Sincronizar ahora</Button>
            <Button type="button" size="sm" variant="secondary" disabled={pending}
              onClick={() => {
                if (confirm('¿Activar Google Calendar para todos los hermanos activos que tienen correo en su ficha? Recibirán todos los tipos de eventos y cada uno podrá cambiarlo o desactivarlo en su Configuración. No se cambia a quien ya eligió algo.'))
                  accion(activarGoogleParaTodos, (r) => r.activados ? `Activado para ${r.activados} ${r.activados === 1 ? 'hermano' : 'hermanos'}. Los eventos se están enviando.` : 'No había nadie nuevo para activar: todos con correo ya tienen su elección.')
              }}>
              Activar para todos
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled={pending}
              onClick={() => { if (confirm('¿Desconectar la cuenta de Google? Dejarán de enviarse eventos.')) accion(desconectarGoogle, 'Desconectada.') }}>
              Desconectar
            </Button>
          </>
        ) : (
          <a href="/api/google/conectar" className="inline-flex items-center h-8 px-3.5 rounded-full text-[13px] font-semibold text-white"
            style={{ background: 'var(--accent)' }}>
            Conectar cuenta de Google
          </a>
        )}
      </div>
      {msg && <p role="status" className="text-[13px]" style={{ color: msg.ok ? 'var(--success)' : 'var(--error)' }}>{msg.texto}</p>}
    </div>
  )
}
