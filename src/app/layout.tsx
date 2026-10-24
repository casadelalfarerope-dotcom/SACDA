import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Logo from '@/components/ui/Logo'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'Casa del Alfarero',
  description: 'Sistema de administración interna',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Alfarero',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6efe4' },
    { media: '(prefers-color-scheme: dark)', color: '#15100c' },
  ],
  width: 'device-width',
  initialScale: 1,
}

const temaInicial = `try{var t=localStorage.getItem('tema');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es-PE" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: temaInicial }} />
      </head>
      <body>
        {/* Bienvenida al abrir la app: el logo se arma y la pantalla se desvanece sola (solo CSS). */}
        <div id="bienvenida" aria-hidden="true">
          <Logo tamano={96} animacion="entrada" />
          <p>Casa del Alfarero</p>
        </div>
        {children}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
          }
        ` }} />
      </body>
    </html>
  )
}
