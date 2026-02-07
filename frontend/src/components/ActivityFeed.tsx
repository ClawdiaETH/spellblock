'use client'

import { useEffect, useState } from 'react'
import { useWatchContractEvent, usePublicClient } from 'wagmi'
import { base } from 'viem/chains'
import { CONTRACTS, SPELLBLOCK_CORE_ABI } from '@/config/contracts'
import { formatUnits, parseAbiItem } from 'viem'

interface CommitActivity {
  player: string
  stake: bigint
  timestamp: number
  streak: number
}

export function ActivityFeed({ roundId }: { roundId?: bigint }) {
  const [activities, setActivities] = useState<CommitActivity[]>([])
  const contracts = CONTRACTS[base.id]
  const publicClient = usePublicClient({ chainId: base.id })

  // Fetch past events on mount
  useEffect(() => {
    if (!roundId || !publicClient) return

    const fetchPastEvents = async () => {
      try {
        // Get current block and search last 9000 blocks (~5 hours on Base)
        // Note: 1rpc limits getLogs to 10000 blocks max
        const currentBlock = await publicClient.getBlockNumber()
        const fromBlock = currentBlock > 9000n ? currentBlock - 9000n : 0n
        
        console.log(`Fetching CommitSubmitted events from block ${fromBlock} for roundId ${roundId}`)
        
        const logs = await publicClient.getLogs({
          address: contracts.spellBlockCore,
          event: parseAbiItem('event CommitSubmitted(uint256 indexed roundId, address indexed player, uint256 stake, uint256 timestamp, uint256 streak)'),
          fromBlock,
          toBlock: 'latest',
        })

        console.log(`Found ${logs.length} total CommitSubmitted events`)
        
        // Filter for current round client-side
        const roundLogs = logs.filter(log => log.args.roundId === roundId)
        console.log(`Found ${roundLogs.length} events for round ${roundId}`)

        const pastActivities = roundLogs.map(log => ({
          player: log.args.player as string,
          stake: log.args.stake as bigint,
          timestamp: Number(log.args.timestamp),
          streak: Number(log.args.streak),
        }))

        setActivities(pastActivities.reverse().slice(0, 10))
      } catch (error) {
        console.error('Failed to fetch past events:', error)
      }
    }

    fetchPastEvents()
  }, [roundId, publicClient, contracts.spellBlockCore])

  // Watch for new commits
  useWatchContractEvent({
    address: contracts.spellBlockCore,
    abi: SPELLBLOCK_CORE_ABI,
    eventName: 'CommitSubmitted',
    chainId: base.id,
    onLogs: (logs) => {
      // Filter for current round
      const roundLogs = roundId ? logs.filter(log => log.args.roundId === roundId) : logs
      if (roundLogs.length === 0) return
      
      const newActivities = roundLogs.map(log => ({
        player: log.args.player!,
        stake: log.args.stake!,
        timestamp: Number(log.args.timestamp!),
        streak: Number(log.args.streak!),
      }))
      setActivities(prev => [...newActivities, ...prev].slice(0, 10))
    }
  })

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  const formatStake = (stake: bigint) => {
    const formatted = parseFloat(formatUnits(stake, 18))
    if (formatted >= 1000000) {
      return `${(formatted / 1000000).toFixed(1)}M`
    } else if (formatted >= 1000) {
      return `${(formatted / 1000).toFixed(1)}K`
    }
    return formatted.toFixed(0)
  }

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">⚡</span>
        <h3 className="font-heading font-bold text-amber-bright">Live activity</h3>
      </div>
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="text-center text-text-dim text-sm py-8">
            <span className="text-2xl block mb-2">👻</span>
            No commits yet this round
          </div>
        ) : (
          activities.map((activity, i) => (
            <div key={i} className="flex items-center justify-between text-sm bg-background-darker p-3 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-violet-bright rounded-full animate-pulse" />
                <span className="font-mono text-text-secondary">
                  {truncateAddress(activity.player)}
                </span>
              </div>
              <div className="text-right">
                <div className="text-amber-bright font-bold">
                  {formatStake(activity.stake)} $CLAWDIA
                </div>
                {activity.streak > 0 && (
                  <div className="text-xs text-text-dim">
                    🔥 {activity.streak} streak
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {activities.length > 0 && (
        <div className="text-center text-xs text-text-dim mt-3">
          No words shown until reveal phase 🤫
        </div>
      )}
    </div>
  )
}
