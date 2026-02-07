'use client'

import { useEffect, useState } from 'react'
import { useConnect, useAccount } from 'wagmi'
import { useFarcasterMiniApp } from '@/contexts/FarcasterMiniAppContext'

export function FarcasterAutoConnect() {
  const { isInMiniApp, isReady } = useFarcasterMiniApp()
  const { connect, connectors } = useConnect()
  const { isConnected, isConnecting } = useAccount()
  const [attempted, setAttempted] = useState(false)

  // Debug logging
  useEffect(() => {
    console.log('FarcasterAutoConnect state:', {
      isInMiniApp,
      isReady,
      isConnected,
      isConnecting,
      attempted,
      connectorIds: connectors.map(c => ({ id: c.id, name: c.name, type: c.type }))
    })
  }, [isInMiniApp, isReady, isConnected, isConnecting, attempted, connectors])

  useEffect(() => {
    // Try to connect if we have a Farcaster connector, regardless of mini app detection
    // The connector itself knows if it's in a valid environment
    if (isConnected || isConnecting || attempted) return
    
    // Wait for SDK to be ready
    if (!isReady) return

    // Find the Farcaster connector
    const farcasterConnector = connectors.find(
      (c) => c.id === 'farcasterMiniApp' || c.type === 'farcasterMiniApp' || c.name.toLowerCase().includes('farcaster')
    )

    if (farcasterConnector) {
      console.log('Found Farcaster connector, attempting connect:', farcasterConnector.id)
      setAttempted(true)
      connect({ connector: farcasterConnector })
    } else {
      console.log('No Farcaster connector in list:', connectors.map(c => c.id))
    }
  }, [isReady, isConnected, isConnecting, connect, connectors, attempted])

  // This component renders nothing - it just handles auto-connect logic
  return null
}
