import type { Metadata } from 'next'
import { Instrument_Serif, DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import dynamic from 'next/dynamic'

const Providers = dynamic(() => import('@/components/Providers').then(mod => mod.Providers), {
  ssr: false,
})

const instrumentSerif = Instrument_Serif({ 
  subsets: ['latin'], 
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-display'
})

const dmSans = DM_Sans({ 
  subsets: ['latin'], 
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body'
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono'
})

export const metadata: Metadata = {
  title: 'SpellBlock | Commit-Reveal Word Game',
  description: 'A strategic word game on Base. Commit your word, reveal when the spell drops, win $CLAWDIA!',
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="fc:miniapp"
          content={JSON.stringify({
            version: "1",
            imageUrl: "https://spellblock.app/og-image.png",
            button: {
              title: "Play Now",
              action: {
                type: "launch_frame",
                name: "SpellBlock",
                url: "https://spellblock.app/",
                splashImageUrl: "https://spellblock.app/splash.png",
                splashBackgroundColor: "#f5f0ec"
              }
            }
          })}
        />
      </head>
      <body className={`${instrumentSerif.variable} ${dmSans.variable} ${jetbrainsMono.variable} font-body`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
