import type { LucideIcon } from 'lucide-react'
import Logo from './Logo'

// Ícono de la aplicación: cuadrado redondeado con degradado, como los íconos de Apple.
export function IconoApp({ texto = 'CA', tamano = 36, className = '', animacion }: { texto?: string; tamano?: number; className?: string; animacion?: 'entrada' | 'cargando' }) {
  return (
    <span aria-hidden="true" className={`inline-flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
      style={{
        width: tamano, height: tamano, borderRadius: tamano * 0.27, fontSize: tamano * (texto.length > 2 ? 0.3 : 0.38),
        background: 'linear-gradient(145deg, #d9a273 0%, #a35d2d 55%, #6b3a1c 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 1px 3px rgba(0,0,0,0.15)',
        letterSpacing: '-0.02em',
      }}>
      {texto === 'CA' ? <Logo tamano={tamano * 0.68} color="#fff" className="-mt-[6%]" animacion={animacion} /> : texto}
    </span>
  )
}

// Ícono de módulo: glifo blanco sobre cuadrado de color (estilo Ajustes de iOS).
export function IconoModulo({ icon: Icon, color, tamano = 28 }: { icon: LucideIcon; color: string; tamano?: number }) {
  return (
    <span aria-hidden="true" className="inline-flex items-center justify-center flex-shrink-0"
      style={{ width: tamano, height: tamano, borderRadius: tamano * 0.26, background: color }}>
      <Icon size={tamano * 0.58} color="#fff" strokeWidth={2.2} />
    </span>
  )
}
