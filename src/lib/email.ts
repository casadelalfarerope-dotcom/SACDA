import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'Casa del Alfarero <noreply@casadelalfarero.pe>'

export async function enviarEmail(to: string | string[], subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY no configurada — email no enviado')
    return { ok: false }
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html })
  if (error) console.error('[email] Error al enviar:', error)
  return { ok: !error }
}

// ---- Plantillas ----

export function tplCumpleanios(nombre: string, dias: number) {
  const cuando = dias === 0 ? '¡hoy!' : dias === 1 ? 'mañana' : `en ${dias} días`
  return {
    subject: `Cumpleaños de ${nombre.split(' ')[0]} — ${cuando}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#0071e3;margin-bottom:8px">🎂 Cumpleaños próximo</h2>
        <p style="color:#1d1d1f;font-size:16px">
          <strong>${nombre}</strong> cumple años ${cuando}.
        </p>
        <p style="color:#86868b;font-size:14px">
          Recuerda preparar el arte de cumpleaños con anticipación.
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? ''}/congregantes"
           style="display:inline-block;margin-top:16px;padding:10px 20px;
                  background:#0071e3;color:#fff;border-radius:10px;text-decoration:none;font-size:14px">
          Ver perfil
        </a>
        <hr style="margin:24px 0;border:none;border-top:1px solid #d2d2d7"/>
        <p style="color:#86868b;font-size:12px">Casa del Alfarero — Sistema interno</p>
      </div>`,
  }
}

export function tplTareaAsignada(nombrePersona: string, tituloTarea: string, limite: string | null, url: string) {
  return {
    subject: `Nueva tarea asignada: ${tituloTarea}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#0071e3;margin-bottom:8px">📋 Tarea asignada</h2>
        <p style="color:#1d1d1f;font-size:16px">
          Hola <strong>${nombrePersona.split(' ')[0]}</strong>, se te asignó una tarea:
        </p>
        <div style="background:#f5f5f7;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:0;font-weight:600;color:#1d1d1f">${tituloTarea}</p>
          ${limite ? `<p style="margin:8px 0 0;font-size:13px;color:#86868b">Fecha límite: ${limite}</p>` : ''}
        </div>
        <a href="${url}"
           style="display:inline-block;padding:10px 20px;
                  background:#0071e3;color:#fff;border-radius:10px;text-decoration:none;font-size:14px">
          Ver tarea
        </a>
        <hr style="margin:24px 0;border:none;border-top:1px solid #d2d2d7"/>
        <p style="color:#86868b;font-size:12px">Casa del Alfarero — Sistema interno</p>
      </div>`,
  }
}

export function tplArteAprobado(destino: 'multimedia' | 'impresiones', tituloTarea: string, urlArchivo: string, urlTarea: string) {
  const label = destino === 'multimedia' ? 'Multimedia' : 'Impresiones'
  return {
    subject: `Arte listo para ${label}: ${tituloTarea}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#34c759;margin-bottom:8px">✅ Arte aprobado</h2>
        <p style="color:#1d1d1f;font-size:16px">
          El arte <strong>${tituloTarea}</strong> fue aprobado y está listo para <strong>${label}</strong>.
        </p>
        <div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap">
          <a href="${urlArchivo}"
             style="padding:10px 20px;background:#0071e3;color:#fff;border-radius:10px;text-decoration:none;font-size:14px">
            Descargar arte
          </a>
          <a href="${urlTarea}"
             style="padding:10px 20px;background:#f5f5f7;color:#1d1d1f;border-radius:10px;text-decoration:none;font-size:14px">
            Ver tarea
          </a>
        </div>
        <hr style="margin:24px 0;border:none;border-top:1px solid #d2d2d7"/>
        <p style="color:#86868b;font-size:12px">Casa del Alfarero — Sistema interno</p>
      </div>`,
  }
}
