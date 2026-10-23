import { NextResponse, type NextRequest } from 'next/server'

const DESTINOS: Record<string, string> = { mi: '/mi', academia: '/taller', admin: '/' }

// Después de iniciar sesión se abre el último espacio usado (Mi espacio,
// Academia o Administración). Cada espacio verifica el acceso por su cuenta:
// quien no tiene permisos del panel es enviado a Mi espacio.
export function GET(request: NextRequest) {
  const ultimo = request.cookies.get('sacda_espacio')?.value
  return NextResponse.redirect(new URL(DESTINOS[ultimo ?? ''] ?? '/', request.url))
}
