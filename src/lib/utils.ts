import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Una fecha sin hora ("2026-10-22") se interpreta como medianoche UTC; se muestra en UTC para
// no correrla un día. Una fecha con hora se muestra en hora de Perú, también en el servidor.
function zonaPara(date: string | Date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? 'UTC' : 'America/Lima'
}

export function formatDate(date: string | Date, opts?: { time?: boolean }) {
  const d = typeof date === 'string' ? new Date(date) : date
  const timeZone = zonaPara(date)
  const dateStr = d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone,
  })
  if (!opts?.time) return dateStr
  const timeStr = d.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  })
  return `${dateStr}, ${timeStr}`
}

export function formatDateShort(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: zonaPara(date),
  })
}

export function calcularEdad(fechaNacimiento: string | Date): number {
  const hoy = new Date()
  const nac =
    typeof fechaNacimiento === 'string'
      ? new Date(`${fechaNacimiento.slice(0, 10)}T00:00:00`)
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
      ? new Date(`${fechaNacimiento.slice(0, 10)}T00:00:00`)
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
    .split(/\s+/)
    .filter((n) => /^\p{L}/u.test(n))
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

// Fecha de hoy (YYYY-MM-DD) en hora de Perú, igual en el servidor (UTC) y en el navegador.
export function hoyLima(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
}
