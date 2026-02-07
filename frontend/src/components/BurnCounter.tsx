'use client'

import { useReadContract } from 'wagmi'
import { base } from 'viem/chains'
import { CONTRACTS, ERC20_ABI } from '@/config/contracts'

const BURN_ADDRESS = '0x000000000000000000000000000000000000dead'

export function BurnCounter() {
  const chainId = base.id
  const contracts = CONTRACTS[chainId]

  const { data: burnedAmount } = useReadContract({
    address: contracts.clawdiaToken,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [BURN_ADDRESS],
    chainId,
  })

  const formatAmount = (n: bigint) => {
    const val = Number(n) / 1e18
    if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(2) + 'B'
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M'
    if (val >= 1_000) return (val / 1_000).toFixed(0) + 'K'
    return val.toFixed(0)
  }

  return (
    <div className="flex items-center gap-2.5 px-4 py-3 bg-surface border border-border rounded-xl">
      <div className="text-[22px]">🔥</div>
      <div className="flex-1">
        <div className="text-[10px] text-text-dim uppercase tracking-wider">Total burned</div>
        <div className="font-mono text-base font-semibold text-red">
          {formatAmount(burnedAmount || 0n)}{' '}
          <span className="text-[10.5px] font-normal text-text-dim">$CLAWDIA</span>
        </div>
      </div>
      <div className="font-mono text-[9.5px] px-2 py-0.5 bg-red/10 border border-red/20 rounded text-red uppercase tracking-wider">
        forever
      </div>
    </div>
  )
}
