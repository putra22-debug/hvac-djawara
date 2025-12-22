import type { Metadata } from 'next'
import { Providers } from './providers'
import { Toaster } from 'sonner'
import './globals.css'

export const viewport = {
  themeColor: '#2563eb',
}

export const metadata: Metadata = {
  title: 'Djawara HVAC - Professional Service Management',
  description: 'Service management platform for HVAC professionals',
  applicationName: 'Djawara HVAC',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Djawara HVAC',
  },
  icons: {
    icon: [{ url: '/icon.png', sizes: '512x512', type: 'image/png' }],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
