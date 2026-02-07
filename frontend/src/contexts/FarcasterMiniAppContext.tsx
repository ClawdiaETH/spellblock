'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

// Define User type based on SDK context (matches UserContext from SDK)
interface User {
  fid: number
  username?: string
  displayName?: string
  pfpUrl?: string
}

interface FarcasterMiniAppContextType {
  isInMiniApp: boolean
  isReady: boolean
  user: User | null
  authToken: any
  initializeApp: () => Promise<void>
}

const FarcasterMiniAppContext = createContext<FarcasterMiniAppContextType | null>(null)

interface FarcasterMiniAppProviderProps {
  children: ReactNode
  onReady?: () => void
}

export function FarcasterMiniAppProvider({ 
  children, 
  onReady 
}: FarcasterMiniAppProviderProps) {
  const [isInMiniApp, setIsInMiniApp] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [authToken, setAuthToken] = useState<any>(null)

  const initializeApp = async () => {
    if (isReady) return
    if (typeof window === 'undefined') return

    try {
      // Dynamically import SDK only on client
      const { sdk } = await import('@farcaster/miniapp-sdk')
      
      // Get user context - need to await it since it might be async
      const context = await sdk.context
      const currentUser = context?.user || null
      setUser(currentUser)

      // Get auth token
      const token = await sdk.quickAuth.getToken()
      setAuthToken(token)

      // Call ready after everything is initialized
      await sdk.actions.ready()
      setIsReady(true)
      onReady?.()

      console.log('Farcaster Mini App initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Farcaster Mini App:', error)
      // Still set ready to true to prevent infinite loading
      setIsReady(true)
      onReady?.()
    }
  }

  useEffect(() => {
    // Skip on server
    if (typeof window === 'undefined') return
    
    // Always try to initialize SDK - it will only work in mini app context
    // This is more reliable than checking window.parent
    const initSDK = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk')
        
        // Check if we have context (means we're in a mini app)
        const context = await sdk.context
        
        if (context) {
          console.log('Mini app context detected:', context)
          setIsInMiniApp(true)
          
          if (context.user) {
            setUser(context.user)
          }
          
          // Call ready to dismiss splash screen
          await sdk.actions.ready()
          setIsReady(true)
          console.log('Mini app ready() called successfully')
        } else {
          console.log('No mini app context - running in web mode')
          setIsInMiniApp(false)
          setIsReady(true)
        }
      } catch (error) {
        console.log('SDK initialization error (likely not in mini app):', error)
        // Not in mini app or SDK failed - that's fine for web
        setIsInMiniApp(false)
        setIsReady(true)
      }
    }
    
    // Small delay to ensure React has hydrated
    const timer = setTimeout(initSDK, 100)
    return () => clearTimeout(timer)
  }, [])

  const value: FarcasterMiniAppContextType = {
    isInMiniApp,
    isReady,
    user,
    authToken,
    initializeApp
  }

  return (
    <FarcasterMiniAppContext.Provider value={value}>
      {children}
    </FarcasterMiniAppContext.Provider>
  )
}

// Default values for when context isn't available (SSR or before Provider mounts)
const defaultContext: FarcasterMiniAppContextType = {
  isInMiniApp: false,
  isReady: false,
  user: null,
  authToken: null,
  initializeApp: async () => {},
}

export function useFarcasterMiniApp() {
  const context = useContext(FarcasterMiniAppContext)
  // Return defaults instead of throwing - handles SSR and dynamic import timing
  return context ?? defaultContext
}