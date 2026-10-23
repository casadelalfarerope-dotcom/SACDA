import EspacioShell from '@/components/espacio/EspacioShell'

// La Academia es un espacio propio: comparte la barra superior (cuadrícula, avisos y perfil).
export default function TallerLayout({ children }: { children: React.ReactNode }) {
  return <EspacioShell espacio="academia">{children}</EspacioShell>
}
