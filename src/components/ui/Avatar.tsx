import { getInitials } from '@/lib/utils'

interface AvatarProps {
  nombre: string
  fotoUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: { container: 'w-8 h-8 text-xs', img: 32 },
  md: { container: 'w-10 h-10 text-sm', img: 40 },
  lg: { container: 'w-14 h-14 text-lg', img: 56 },
}

const colors = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500',
  'bg-orange-500', 'bg-pink-500', 'bg-teal-500',
]

function colorForName(nombre: string) {
  const code = nombre.charCodeAt(0) + (nombre.charCodeAt(1) || 0)
  return colors[code % colors.length]
}

export default function Avatar({ nombre, fotoUrl, size = 'md', className = '' }: AvatarProps) {
  const { container } = sizeMap[size]
  const color = colorForName(nombre)

  if (fotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fotoUrl}
        alt={nombre}
        className={`${container} rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <div className={`${container} ${color} rounded-full flex items-center justify-center text-white font-semibold ${className}`}>
      {getInitials(nombre)}
    </div>
  )
}
