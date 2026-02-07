'use client'

import { useEffect, useState } from 'react'
import { usePublicClient, useReadContract } from 'wagmi'
import { formatEther, Address } from 'viem'
import { CONTRACTS, SPELLBLOCK_CORE_ABI } from '@/config/contracts'

interface CommitEvent {
  player: Address
  stake: bigint
  timestamp: bigint
  txHash: string
}

export function RecentCommits() {
  const [commits, setCommits] = useState<CommitEvent[]>([])
  const [loading, setLoading] = useState(true)
  const publicClient = usePublicClient()

  // Get current round ID
  const { data: currentRoundId } = useReadContract({
    address: CONTRACTS[8453].spellBlockGame as `0x${string}`,
    abi: SPELLBLOCK_CORE_ABI,
    functionName: 'currentRoundId',
  })

  const roundId = currentRoundId ? Number(currentRoundId) : 0

  useEffect(() => {
    if (!publicClient || !roundId) {
      console.log('RecentCommits: waiting for client/roundId', { publicClient: !!publicClient, roundId })
      return
    }

    const fetchCommits = async () => {
      try {
        const currentBlock = await publicClient.getBlockNumber()
        
        // Fetch last 5000 blocks (~3 hours on Base at 2s/block)
        const fromBlock = currentBlock - 5000n
        
        console.log('Fetching commits', { roundId, fromBlock: fromBlock.toString(), currentBlock: currentBlock.toString() })

        const logs = await publicClient.getLogs({
          address: CONTRACTS[8453].spellBlockGame as `0x${string}`,
          event: {
            type: 'event',
            name: 'CommitSubmitted',
            inputs: [
              { type: 'uint256', indexed: true, name: 'roundId' },
              { type: 'address', indexed: true, name: 'player' },
              { type: 'uint256', indexed: false, name: 'stake' },
              { type: 'uint256', indexed: false, name: 'timestamp' },
              { type: 'uint256', indexed: false, name: 'streak' }
            ]
          },
          args: {
            roundId: BigInt(roundId)
          },
          fromBlock,
          toBlock: 'latest'
        })

        const commitData: CommitEvent[] = logs.map(log => ({
          player: log.args.player as Address,
          stake: log.args.stake as bigint,
          timestamp: log.args.timestamp as bigint,
          txHash: log.transactionHash as string
        })).reverse() // Most recent first

        console.log('Found commits:', commitData.length, commitData)
        setCommits(commitData)
      } catch (error) {
        console.error('Error fetching commits:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCommits()
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchCommits, 10000)
    return () => clearInterval(interval)
  }, [publicClient, roundId])

  const formatAddress = (addr: Address) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const formatTimeAgo = (timestamp: bigint) => {
    const now = Math.floor(Date.now() / 1000)
    const diff = now - Number(timestamp)
    
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-auto flex items-center justify-center">
        <div className="text-center py-12 px-6">
          <div className="text-4xl mb-3">🔮</div>
          <div className="text-sm font-semibold mb-2">Loading...</div>
          <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
            Fetching recent commits
          </div>
        </div>
      </div>
    )
  }

  if (commits.length === 0) {
    return (
      <div className="flex-1 overflow-auto flex items-center justify-center">
        <div className="text-center py-12 px-6">
          <div className="text-4xl mb-3">🔮</div>
          <div className="text-sm font-semibold mb-2">No commits yet</div>
          <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
            Be the first to commit!
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-[18px] py-3">
        {commits.map((commit, idx) => (
          <div 
            key={commit.txHash}
            className="mb-3 pb-3 border-b last:border-0"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-start justify-between mb-1.5">
              <a
                href={`https://basescan.org/address/${commit.player}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                {formatAddress(commit.player)}
              </a>
              <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                {formatTimeAgo(commit.timestamp)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span style={{ color: 'var(--text-dim)' }}>Staked</span>
              <span className="font-semibold">
                {parseFloat(formatEther(commit.stake)).toFixed(2)} CLAWDIA
              </span>
            </div>
            <a
              href={`https://basescan.org/tx/${commit.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] hover:underline mt-1 inline-block"
              style={{ color: 'var(--text-dim)' }}
            >
              View tx →
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
