'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Select from '@/components/ui/Select'

// Elegir a qué fondo va un aporte, gasto o actividad. Vacío = Fondo General.
export default function SelectFondo({ name = 'fondo_id', label, valor = '' }: { name?: string; label: string; valor?: string }) {
  const [fondos, setFondos] = useState<{ value: string; label: string }[]>([])
  useEffect(() => {
    createClient().from('fondos').select('id, nombre').eq('activo', true).order('nombre')
      .then(({ data }) => setFondos((data ?? []).map((f) => ({ value: f.id, label: f.nombre }))))
  }, [])
  if (!fondos.length) return <input type="hidden" name={name} value={valor} />
  return <Select name={name} label={label} defaultValue={valor} options={[{ value: '', label: 'Fondo General' }, ...fondos]} />
}
