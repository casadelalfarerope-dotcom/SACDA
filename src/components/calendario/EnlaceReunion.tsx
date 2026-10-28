import { Video } from 'lucide-react'

// Botón para entrar a una reunión virtual (Meet, Zoom u otra).
export default function EnlaceReunion({ href }: { href: string }) {
  const plataforma = /meet\.google\./.test(href) ? 'Meet' : /zoom\./.test(href) ? 'Zoom' : null
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 mt-1.5 h-8 px-3 rounded-full text-[13px] font-semibold"
      style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
      <Video size={15} aria-hidden="true" /> Entrar a la reunión{plataforma ? ` (${plataforma})` : ''}
    </a>
  )
}
