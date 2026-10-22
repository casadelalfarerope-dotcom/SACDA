export type TipoGrabacion = 'youtube' | 'video' | 'externa'

export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|live\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1]! : null
}

// youtube y video permiten medir cuánto se vio; externa (Drive, OneDrive…) no.
export function tipoGrabacion(url: string): TipoGrabacion {
  if (youtubeId(url)) return 'youtube'
  if (/\.(mp4|webm|m4v|mov)(\?|#|$)/i.test(url) || /\.r2\.(dev|cloudflarestorage\.com)\//i.test(url)) return 'video'
  return 'externa'
}

export function urlEmbebible(url: string): string | null {
  const drive = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/)
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`
  return null
}
