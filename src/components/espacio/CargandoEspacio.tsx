import BarraProgreso from '@/components/ui/BarraProgreso'

// Esqueleto mientras carga una página de Mi espacio (la barra superior y los
// módulos ya están en pantalla; solo se reemplaza el contenido).
export default function CargandoEspacio() {
  return (
    <>
    <BarraProgreso debajoDe="espacio" />
    <div role="status" aria-label="Cargando" className="px-4 md:px-8 py-6 max-w-2xl mx-auto space-y-6 animate-fade">
      <div className="space-y-2">
        <div className="h-8 w-52 rounded-xl animate-shimmer" style={{ background: 'var(--surface)' }} />
        <div className="h-4 w-36 rounded-lg animate-shimmer" style={{ background: 'var(--surface)' }} />
      </div>
      {[0, 1].map((g) => (
        <div key={g} className="space-y-2">
          <div className="h-3 w-28 rounded animate-shimmer ml-4" style={{ background: 'var(--surface)' }} />
          <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-shimmer" style={{ background: 'var(--surface)', animationDelay: `${(g * 3 + i) * 80}ms` }} />
            ))}
          </div>
        </div>
      ))}
    </div>
    </>
  )
}
