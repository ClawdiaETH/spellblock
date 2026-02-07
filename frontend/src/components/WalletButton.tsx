'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { useFarcasterMiniApp } from '@/contexts/FarcasterMiniAppContext'

export function WalletButton() {
  const { isInMiniApp, user } = useFarcasterMiniApp()
  
  // This will only render when wagmi context is available
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { address, isConnected } = useAccount()

    // In mini app, show user info instead of wallet connect
    if (isInMiniApp) {
      if (isConnected && user) {
        return (
          <div className="flex items-center gap-3 px-4 py-2 bg-violet-600/20 rounded-lg border border-violet-bright/30">
            {user.pfpUrl && (
              <img 
                src={user.pfpUrl} 
                alt={`${user.displayName} avatar`}
                className="w-6 h-6 rounded-full"
              />
            )}
            <div className="text-sm">
              <div className="text-violet-bright font-medium">
                @{user.username || user.displayName || `fid:${user.fid}`}
              </div>
              {address && (
                <div className="text-text-dim text-xs">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </div>
              )}
            </div>
          </div>
        )
      }
      
      return (
        <div className="px-4 py-2 bg-violet-600/50 rounded-lg text-violet-bright font-medium">
          Connecting...
        </div>
      )
    }

    // Web environment - use RainbowKit
    return (
      <ConnectButton 
        label="Connect Wallet"
        showBalance={false}
        chainStatus="icon"
        accountStatus={isConnected ? "address" : "full"}
      />
    )
  } catch {
    // Fallback when context not ready
    return (
      <button className="px-4 py-2 bg-violet-600 rounded-lg text-white font-medium">
        Connect Wallet
      </button>
    )
  }
}
