import PersonaForm from '@/components/PersonaForm'
import { crearPersona } from '@/app/actions/congregantes'
import { Pagina, Tarjeta } from '@/components/ui/ios'

export default function NuevoCongregantePage() {
  return (
    <Pagina ancho="estrecho" titulo="Nuevo congregante" subtitulo="Registrar una nueva ficha personal"
      volver={{ href: '/congregantes', texto: 'Congregantes' }}>
      <Tarjeta><PersonaForm onSubmit={crearPersona} /></Tarjeta>
    </Pagina>
  )
}
