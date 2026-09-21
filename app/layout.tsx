import { Analytics } from '@vercel/analytics/next'
import Script from 'next/script'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cravings — Good food. Bad attitude.',
  description: 'Cravings serves smash burgers, hot chicken, and fresh comfort food in Bahria Orchard Lahore.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#1e1f1c',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          id="retell-widget"
          src="https://dashboard.retellai.com/retell-widget-v2.js"
          type="module"
          data-public-key="public_key_4d5c15b1e1a76936a6238"
          data-voice-public-key="public_key_4d5c15b1e1a76936a6238"
          data-voice-agent-id="agent_fa27e6fcf7fc76b6bde6f63071"
          data-title="Cravings Voice Agent"
          data-fab-text="🎙️ Talk to us"
          strategy="afterInteractive"
        />
      </head>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
