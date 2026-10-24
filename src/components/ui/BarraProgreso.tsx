// Barra de progreso fina pegada al borde inferior de la barra superior.
// Va como primer elemento del contenido; con "sticky" queda bajo el encabezado
// aunque la página tenga animación de entrada.
export default function BarraProgreso({ debajoDe }: { debajoDe: 'espacio' | 'panel' }) {
  return (
    <div aria-hidden="true" className={`sticky z-20 h-0.5 -mb-0.5 overflow-hidden ${debajoDe === 'espacio' ? 'top-14' : 'top-12 md:-mt-2 md:mb-1.5'}`}>
      <div className="h-full rounded-full" style={{ background: 'var(--accent)', width: '60%', animation: 'ui-progress 1.2s ease-in-out infinite' }} />
    </div>
  )
}
