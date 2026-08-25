import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, opts?: { time?: boolean }) {
  const d = typeof date === 'string' ? new Date(date) : date
  const dateStr = d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  if (!opts?.time) return dateStr
  const timeStr = d.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${dateStr}, ${timeStr}`
}

export function formatDateShort(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function calcularEdad(fechaNacimiento: string | Date): number {
  const hoy = new Date()
  const nac =
    typeof fechaNacimiento === 'string'
      ? new Date(fechaNacimiento)
      : fechaNacimiento
  let edad = hoy.getFullYear() - nac.getFullYear()
  const mes = hoy.getMonth() - nac.getMonth()
  if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) {
    edad--
  }
  return edad
}

export function diasParaCumpleanios(fechaNacimiento: string | Date): number {
  const hoy = new Date()
  const nac =
    typeof fechaNacimiento === 'string'
      ? new Date(fechaNacimiento)
      : fechaNacimiento
  const proxCumple = new Date(
    hoy.getFullYear(),
    nac.getMonth(),
    nac.getDate()
  )
  if (proxCumple < hoy) {
    proxCumple.setFullYear(hoy.getFullYear() + 1)
  }
  const diff = proxCumple.getTime() - hoy.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function getInitials(nombre: string): string {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}
