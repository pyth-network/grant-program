import { TokenDispenserProvider as CTokenDispenserProvider } from 'claim_sdk/solana'
import { ReactNode, createContext, useContext, useMemo } from 'react'
import { useAnchorWallet } from '@solana/wallet-adapter-react'
import { web3 } from '@coral-xyz/anchor'

const TokenDispenserContext = createContext<
  CTokenDispenserProvider | undefined
>(undefined)

export type TokenDispenserProviderProps = { children: ReactNode }
export function TokenDispenserProvider({
  children,
}: TokenDispenserProviderProps) {
  const wallet = useAnchorWallet()

  const tokenDispenser = useMemo(() => {
    if (wallet === undefined) return undefined
    return new CTokenDispenserProvider(
      process.env.NEXT_PUBLIC_ENDPOINT!,
      wallet,
      new web3.PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!)
    )
  }, [wallet])

  return (
    <TokenDispenserContext.Provider value={tokenDispenser}>
      {children}
    </TokenDispenserContext.Provider>
  )
}

// It will return undefined if no Solana wallet is connected.
export function useTokenDispenserProvider() {
  const tokenDispenser = useContext(TokenDispenserContext)
  return tokenDispenser
}
