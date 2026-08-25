import { Settings } from 'lucide-react'

export default function ConfiguracionPage() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings size={22} style={{ color: 'var(--accent)' }} />
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Configuración
        </h1>
      </div>
      <div className="rounded-2xl border p-8 text-center"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <p className="font-medium" style={{ color: 'var(--foreground)' }}>
          Configuración de preferencias
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Disponible en la siguiente fase de desarrollo.
        </p>
      </div>
    </div>
  )
}
