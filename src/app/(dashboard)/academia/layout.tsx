import { redirect } from 'next/navigation'
import { esLiderAcademia } from '@/lib/academia/servidor'

export default async function AcademiaLayout({ children }: { children: React.ReactNode }) {
  if (!(await esLiderAcademia())) redirect('/taller')
  return children
}
