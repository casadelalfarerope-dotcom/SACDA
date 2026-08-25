import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import EditarTutorialForm from './EditarTutorialForm'

export default async function EditarTutorialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const [{ data: tut }, { data: roles }] = await Promise.all([
    supabase.from('tutoriales').select('*').eq('id', id).single(),
    supabase.from('roles_servicio').select('id, nombre').eq('activo', true).order('orden'),
  ])
  if (!tut) notFound()
  return <EditarTutorialForm tut={tut} roles={roles ?? []} />
}
