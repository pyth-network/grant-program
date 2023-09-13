import { TokenDispenserProvider as CTokenDispenserProvider } from 'claim_sdk/solana'
import { useMemo } from 'react'
import { useAnchorWallet } from '@solana/wallet-adapter-react'
import { web3 } from '@coral-xyz/anchor'

// It will return undefined if no Solana wallet is connected.
export function useTokenDispenserProvider() {
  const anchorWallet = useAnchorWallet()
  return useMemo(() => {
    if (anchorWallet === undefined) return undefined
    return new CTokenDispenserProvider(
      process.env.ENDPOINT!,
      anchorWallet,
      new web3.PublicKey(process.env.PROGRAM_ID!)
    )
  }, [anchorWallet])
}
