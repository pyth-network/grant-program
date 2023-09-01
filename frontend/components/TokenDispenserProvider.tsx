import { TokenDispenserProvider as CTokenDispenserProvider } from 'claim_sdk/solana'
import { ReactNode, createContext, useContext, useMemo } from 'react'
import { useAnchorWallet } from '@solana/wallet-adapter-react'
import { web3 } from '@coral-xyz/anchor'

export const TokenDispensorContext = createContext<
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

  console.log(wallet)
  return (
    <TokenDispensorContext.Provider value={tokenDispenser}>
      {children}
    </TokenDispensorContext.Provider>
  )
}

// It will return undefined if no Solana wallet is connected.
export function useTokenDispenserProvider() {
  const tokenDispenser = useContext(TokenDispensorContext)
  return tokenDispenser
}
