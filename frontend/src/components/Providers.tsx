'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { ThemeProvider } from 'next-themes'
import { getMiniAppConfig } from '@/config/wagmi'
import { FarcasterMiniAppProvider } from '@/contexts/FarcasterMiniAppContext'
import { useState, useEffect, useMemo, type ReactNode } from 'react'
import '@rainbow-me/rainbowkit/styles.css'

// Check if we might be in a mini app - multiple detection methods
function detectMiniApp(): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    // Method 1: iframe check
    if (window.parent !== window) return true
    
    // Method 2: Check for Farcaster user agent or referrer
    if (navigator.userAgent.includes('Warpcast')) return true
    
    // Method 3: Check URL params that Farcaster might add
    const params = new URLSearchParams(window.location.search)
    if (params.has('fc-context') || params.has('fid')) return true
    
    // Method 4: Check if we're in a secure context within an app
    if (window.self !== window.top) return true
  } catch {
    // Cross-origin iframe - likely a mini app
    return true
  }
  
  return false
}

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [inMiniApp, setInMiniApp] = useState(false)
  const [queryClient] = useState(() => new QueryClient())

  useEffect(() => {
    setMounted(true)
    const detected = detectMiniApp()
    setInMiniApp(detected)
    console.log('Mini app detection:', detected)
  }, [])

  // Always use mini app config - it includes both Farcaster connector and can fallback
  // This ensures the Farcaster connector is available when needed
  const config = useMemo(() => {
    if (!mounted) return getMiniAppConfig() // Use mini app config even during hydration
    return getMiniAppConfig()
  }, [mounted])

  // Show children without wallet providers during SSR/initial render
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <FarcasterMiniAppProvider>
            {inMiniApp ? (
              // Mini app environment - no RainbowKit UI
              children
            ) : (
              // Web environment - use RainbowKit
              <RainbowKitProvider 
                theme={darkTheme({
                  accentColor: '#a855f7',
                  accentColorForeground: 'white',
                  borderRadius: 'medium',
                })}
              >
                {children}
              </RainbowKitProvider>
            )}
          </FarcasterMiniAppProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  )
}
