import { redirect } from 'next/navigation'

// Los puestos ahora se definen dentro de cada ministerio.
export default function PuestosPage() {
  redirect('/ministerios')
}
