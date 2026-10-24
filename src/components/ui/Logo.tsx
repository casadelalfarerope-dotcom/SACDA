import { LOGO_TECHO, LOGO_VASIJA, LOGO_VIEWBOX } from '@/lib/logo'

// Logo de Casa del Alfarero. "entrada": el techo se abre desde el centro y la
// vasija sube debajo; "cargando": la vasija respira mientras algo carga.
export default function Logo({ tamano = 40, animacion, color = 'currentColor', className = '', titulo }: {
  tamano?: number
  animacion?: 'entrada' | 'cargando'
  color?: string
  className?: string
  titulo?: string
}) {
  return (
    <svg viewBox={LOGO_VIEWBOX} width={tamano} height={tamano * (1176 / 1248)} fill={color}
      className={`${animacion ? `logo-${animacion}` : ''} ${className}`}
      role={titulo ? 'img' : undefined} aria-label={titulo} aria-hidden={titulo ? undefined : true}>
      <path className="logo-techo" d={LOGO_TECHO} />
      <path className="logo-vasija" d={LOGO_VASIJA} fillRule="evenodd" />
    </svg>
  )
}
