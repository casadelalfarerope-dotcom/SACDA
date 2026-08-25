import { createClient } from '@/lib/supabase/server'
import NuevaCeremoniaForm from './NuevaCeremoniaForm'

export default async function NuevaCeremoniaPage() {
  const supabase = await createClient()

  const { data: personas } = await supabase
    .from('personas')
    .select('id, nombre_completo')
    .order('nombre_completo')

  return <NuevaCeremoniaForm personas={personas ?? []} />
}
