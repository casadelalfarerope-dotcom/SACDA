import EspacioShell from '@/components/espacio/EspacioShell'

// La Academia es un módulo más de Mi espacio: comparte la barra superior y la navegación.
export default function TallerLayout({ children }: { children: React.ReactNode }) {
  return <EspacioShell>{children}</EspacioShell>
}
