import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EditarProgramaForm from './EditarProgramaForm'

export default async function EditarProgramaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: programa } = await supabase
    .from('programas')
    .select('id, titulo, fecha, notas')
    .eq('id', id)
    .single()

  if (!programa) notFound()

  return <EditarProgramaForm programa={programa} />
}
