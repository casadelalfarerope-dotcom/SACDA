import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EditarBienForm from './EditarBienForm'

export default async function EditarBienPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: bien } = await supabase.from('bienes').select('*').eq('id', id).single()
  if (!bien) notFound()
  return <EditarBienForm bien={bien} />
}
