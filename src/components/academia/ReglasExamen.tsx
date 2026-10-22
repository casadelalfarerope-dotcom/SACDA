import { DIAS_PARA_RENDIR, FACTOR_POR_INTENTO, FACTOR_RECUPERACION, notaTope } from '@/lib/academia/reglas'

export default function ReglasExamen({ conRecuperacion = false }: { conRecuperacion?: boolean }) {
  return (
    <div className="p-4 rounded-xl text-sm space-y-2" style={{ background: 'var(--surface-secondary)', color: 'var(--foreground)' }}>
      <p className="font-semibold">Reglas del examen</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Tienes <strong>{DIAS_PARA_RENDIR} días</strong> desde que se publica para rendirlo.</li>
        <li>Puedes rendirlo hasta <strong>3 veces</strong>. Cuenta tu mejor nota, pero cada intento tiene un tope:</li>
      </ul>
      <ul className="grid grid-cols-3 gap-2 text-center">
        {FACTOR_POR_INTENTO.map((f, i) => (
          <li key={i} className="p-2 rounded-lg" style={{ background: 'var(--surface)' }}>
            <span className="block text-xs" style={{ color: 'var(--muted)' }}>Intento {i + 1}</span>
            <span className="font-bold">máx. {notaTope(f)}/20</span>
          </li>
        ))}
      </ul>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>
        Solo podrás dar otro intento si su tope es mayor que tu mejor nota (si ya sacaste 18, el segundo intento no te ayudaría).
        Si empiezas un intento, cuenta aunque no lo envíes.
      </p>
      {conRecuperacion && (
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Examen de recuperación: un solo intento, nota máxima {notaTope(FACTOR_RECUPERACION)}/20.
        </p>
      )}
    </div>
  )
}
