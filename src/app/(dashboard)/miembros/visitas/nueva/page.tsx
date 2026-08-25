import { createClient } from '@/lib/supabase/server'
import NuevaVisitaForm from './NuevaVisitaForm'

export default async function NuevaVisitaPage() {
  const supabase = await createClient()

  const { data: personas } = await supabase
    .from('personas')
    .select('id, nombre_completo')
    .order('nombre_completo')

  return <NuevaVisitaForm personas={personas ?? []} />
}
