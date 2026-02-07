import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'

// WalletConnect Cloud Project ID - get one at https://cloud.walletconnect.com
// Using a demo ID for development - should be replaced for production
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '3a8170812b534d0ff9d794f19a901d64'

// RainbowKit config for web environment (fallback)
export const webConfig = getDefaultConfig({
  appName: 'SpellBlock',
  projectId,
  chains: [base],
  ssr: false,
})

// Create combined config with Farcaster connector
let _combinedConfig: ReturnType<typeof createConfig> | null = null

export function getMiniAppConfig() {
  // Return cached config if available
  if (_combinedConfig) return _combinedConfig
  
  // During SSR, return web config
  if (typeof window === 'undefined') {
    return webConfig
  }
  
  try {
    // Import Farcaster connector
    const { farcasterMiniApp } = require('@farcaster/miniapp-wagmi-connector')
    
    // Create config with Farcaster connector
    // This config works for mini app - Farcaster connector handles wallet connection
    _combinedConfig = createConfig({
      chains: [base],
      transports: {
        [base.id]: http('https://mainnet.base.org'),
      },
      connectors: [farcasterMiniApp()],
      ssr: false,
    })
    
    console.log('Created Farcaster mini app config')
    return _combinedConfig
  } catch (error) {
    console.error('Failed to create mini app config:', error)
    return webConfig
  }
}

// Default export for backward compatibility
export const config = webConfig
