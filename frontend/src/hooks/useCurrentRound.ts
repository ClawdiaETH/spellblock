import { useReadContract } from 'wagmi'
import { base } from 'viem/chains'
import { CONTRACTS, SPELLBLOCK_CORE_ABI } from '@/config/contracts'

export function useCurrentRound() {
  const { data: currentRoundId } = useReadContract({
    address: CONTRACTS[base.id].spellBlockCore as `0x${string}`,
    abi: SPELLBLOCK_CORE_ABI,
    functionName: 'currentRoundId',
    chainId: base.id,
  })

  return {
    currentRoundId: currentRoundId as bigint | undefined,
  }
}
