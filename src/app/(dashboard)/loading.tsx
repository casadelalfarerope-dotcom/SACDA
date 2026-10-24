import BarraProgreso from '@/components/ui/BarraProgreso'

export default function Loading() {
  return (
    <>
    <BarraProgreso debajoDe="panel" />
    <div className="p-4 md:p-8 max-w-3xl mx-auto animate-fade">
      {/* Skeleton del encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-40 rounded-xl animate-shimmer" style={{ background: 'var(--surface)' }} />
          <div className="h-4 w-24 rounded-lg mt-1.5 animate-shimmer" style={{ background: 'var(--surface)' }} />
        </div>
        <div className="h-9 w-24 rounded-xl animate-shimmer" style={{ background: 'var(--surface)' }} />
      </div>

      {/* Skeleton de tarjetas */}
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-2xl animate-shimmer"
            style={{
              background: 'var(--surface)',
              animationDelay: `${i * 80}ms`,
            }}
          />
        ))}
      </div>
    </div>
    </>
  )
}
