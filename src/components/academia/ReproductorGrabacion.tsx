'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { declararVisto, registrarProgreso } from '@/app/actions/taller'
import { tipoGrabacion, urlEmbebible, youtubeId } from '@/lib/academia/grabacion'
import Button from '@/components/ui/Button'

interface YTPlayer { getCurrentTime(): number; getDuration(): number; getPlayerState(): number; destroy(): void }
declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: object) => YTPlayer; PlayerState: { PLAYING: number } }
    onYouTubeIframeAPIReady?: () => void
  }
}

function cargarApiYouTube(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve()
  return new Promise((resolve) => {
    const previo = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => { previo?.(); resolve() }
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(s)
    }
  })
}

// Acumula tramos realmente reproducidos: saltos hacia adelante no cuentan como vistos.
function useSeguimiento(sesionId: string, porcentajeInicial: number) {
  const router = useRouter()
  const pendientes = useRef<[number, number][]>([])
  const ultimo = useRef<number | null>(null)
  const duracion = useRef(0)
  const [porcentaje, setPorcentaje] = useState(porcentajeInicial)

  function registrar(t: number, reproduciendo: boolean) {
    const prev = ultimo.current
    if (reproduciendo && prev != null && t > prev && t - prev <= 3) pendientes.current.push([prev, t])
    ultimo.current = reproduciendo ? t : null
  }

  async function enviar() {
    if (!pendientes.current.length || !duracion.current) return
    const tramos = pendientes.current
    pendientes.current = []
    const res = await registrarProgreso(sesionId, tramos, duracion.current)
    if ('porcentaje' in res) {
      setPorcentaje((p) => {
        if (p < 95 && res.porcentaje >= 95) router.refresh()
        return res.porcentaje
      })
    }
  }

  useEffect(() => {
    const id = setInterval(enviar, 15000)
    const alSalir = () => { void enviar() }
    window.addEventListener('pagehide', alSalir)
    return () => { clearInterval(id); window.removeEventListener('pagehide', alSalir); void enviar() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { registrar, enviar, duracion, porcentaje }
}

function BarraProgreso({ porcentaje }: { porcentaje: number }) {
  const completo = porcentaje >= 95
  return (
    <div className="space-y-1">
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-secondary)' }}
        role="progressbar" aria-valuenow={porcentaje} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de la grabación">
        <div className="h-full rounded-full transition-all" style={{ width: `${porcentaje}%`, background: completo ? 'var(--success)' : 'var(--accent)' }} />
      </div>
      <p className="text-xs" style={{ color: completo ? 'var(--success)' : 'var(--muted)' }}>
        {completo ? 'Viste la clase completa ✓' : `Has visto ${porcentaje}% de la clase. Debes llegar al 95%; adelantar el video no cuenta.`}
      </p>
    </div>
  )
}

function YouTube({ sesionId, url, porcentajeInicial }: { sesionId: string; url: string; porcentajeInicial: number }) {
  const contenedor = useRef<HTMLDivElement>(null)
  const { registrar, enviar, duracion, porcentaje } = useSeguimiento(sesionId, porcentajeInicial)

  useEffect(() => {
    let player: YTPlayer | null = null
    let timer: ReturnType<typeof setInterval> | undefined
    cargarApiYouTube().then(() => {
      if (!contenedor.current || !window.YT) return
      player = new window.YT.Player(contenedor.current, {
        videoId: youtubeId(url),
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onStateChange: () => {
            if (!player) return
            duracion.current = player.getDuration()
            if (player.getPlayerState() !== window.YT!.PlayerState.PLAYING) void enviar()
          },
        },
      })
      timer = setInterval(() => {
        if (!player?.getPlayerState) return
        duracion.current = player.getDuration() || duracion.current
        registrar(player.getCurrentTime(), player.getPlayerState() === window.YT!.PlayerState.PLAYING)
      }, 1000)
    })
    return () => { clearInterval(timer); player?.destroy() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  return (
    <div className="space-y-3">
      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black"><div ref={contenedor} className="w-full h-full" /></div>
      <BarraProgreso porcentaje={porcentaje} />
    </div>
  )
}

function VideoDirecto({ sesionId, url, porcentajeInicial }: { sesionId: string; url: string; porcentajeInicial: number }) {
  const video = useRef<HTMLVideoElement>(null)
  const maximo = useRef(0)
  const { registrar, enviar, duracion, porcentaje } = useSeguimiento(sesionId, porcentajeInicial)

  return (
    <div className="space-y-3">
      <video ref={video} src={url} controls controlsList="nodownload" className="w-full rounded-xl bg-black" preload="metadata"
        onLoadedMetadata={(e) => { duracion.current = e.currentTarget.duration }}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime
          registrar(t, !e.currentTarget.paused)
          if (!e.currentTarget.seeking) maximo.current = Math.max(maximo.current, t)
        }}
        onSeeking={(e) => {
          if (e.currentTarget.currentTime > maximo.current + 2) e.currentTarget.currentTime = maximo.current
        }}
        onPause={() => void enviar()}
        onEnded={() => void enviar()} />
      <BarraProgreso porcentaje={porcentaje} />
    </div>
  )
}

function Externa({ sesionId, url, declarado }: { sesionId: string; url: string; declarado: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const embed = urlEmbebible(url)
  return (
    <div className="space-y-3">
      {embed ? (
        <iframe src={embed} title="Grabación de la clase" allow="autoplay" allowFullScreen className="w-full aspect-video rounded-xl border-0 bg-black" />
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block text-sm underline" style={{ color: 'var(--accent)' }}>
          Abrir la grabación en otra pestaña
        </a>
      )}
      {declarado ? (
        <p className="text-sm" style={{ color: 'var(--success)' }}>Marcaste que viste la clase completa ✓</p>
      ) : (
        <div className="space-y-2">
          <Button type="button" variant="secondary" loading={pending} onClick={() => {
            if (!window.confirm('¿Confirmas que viste la grabación completa?')) return
            startTransition(async () => {
              const res = await declararVisto(sesionId)
              if ('error' in res) setError(res.error)
              else router.refresh()
            })
          }}>Ya vi la clase completa</Button>
          {error && <p role="alert" className="text-xs" style={{ color: 'var(--error)' }}>{error}</p>}
        </div>
      )}
    </div>
  )
}

export default function ReproductorGrabacion({ sesionId, url, porcentajeInicial, declarado }: {
  sesionId: string; url: string; porcentajeInicial: number; declarado: boolean
}) {
  const tipo = tipoGrabacion(url)
  if (tipo === 'youtube') return <YouTube sesionId={sesionId} url={url} porcentajeInicial={porcentajeInicial} />
  if (tipo === 'video') return <VideoDirecto sesionId={sesionId} url={url} porcentajeInicial={porcentajeInicial} />
  return <Externa sesionId={sesionId} url={url} declarado={declarado} />
}
