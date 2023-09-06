import { useWallet as useAptosWallet } from '@aptos-labs/wallet-adapter-react'
import { ChainName, WALLET_NAME } from '@components/wallets/Cosmos'
import { useChainWallet } from '@cosmos-kit/react-lite'
import { useWalletKit } from '@mysten/wallet-kit'
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { useAccount } from 'wagmi'

export function useAptosAddress(): string | undefined {
  const { account } = useAptosWallet()
  return account?.address
}

export function useCosmosAddress(chainName: ChainName): string | undefined {
  const { address } = useChainWallet(chainName, WALLET_NAME)
  return address
}

export function useEVMAddress(): string | undefined {
  const { address } = useAccount()
  return address
}

export function useSolanaAddress(): string | undefined {
  const { publicKey } = useSolanaWallet()
  return publicKey?.toBase58()
}

export function useSuiAddress(): string | undefined {
  const { currentAccount } = useWalletKit()
  return currentAccount?.address
}
