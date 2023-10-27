import {
  useAptosAddress,
  useCosmosAddress,
  useEVMAddress,
  useSolanaAddress,
  useSuiAddress,
} from './useAddress'
import { useSession } from 'next-auth/react'
import { Ecosystem } from '@components/Ecosystem'
import { useCallback } from 'react'
import { useSeiWalletContext } from '@components/wallets/Sei'

// It will return a function that can be used to get the identity of a given ecosystem
// The function will return the identity if the ecosystem is connected
// Else it will return undefined
export function useGetEcosystemIdentity() {
  const aptosAddress = useAptosAddress()
  const evmAddress = useEVMAddress()
  const injectiveAddress = useCosmosAddress('injective')
  const osmosisAddress = useCosmosAddress('osmosis')
  const neutronAddress = useCosmosAddress('neutron')

  const { connectedSeiWallet } = useSeiWalletContext()
  const seiAddress = useCosmosAddress('sei', connectedSeiWallet ?? undefined)
  const solanaAddress = useSolanaAddress()
  const suiAddress = useSuiAddress()
  const { data } = useSession()

  return useCallback(
    (ecosystem: Ecosystem) => {
      switch (ecosystem) {
        case Ecosystem.APTOS:
          return aptosAddress

        case Ecosystem.EVM:
          return evmAddress

        case Ecosystem.INJECTIVE:
          return injectiveAddress

        case Ecosystem.NEUTRON:
          return neutronAddress

        case Ecosystem.OSMOSIS:
          return osmosisAddress

        case Ecosystem.SEI:
          return seiAddress

        case Ecosystem.SOLANA:
          return solanaAddress

        case Ecosystem.SUI:
          return suiAddress

        case Ecosystem.DISCORD:
          return data?.user?.hashedUserId
      }
    },
    [
      aptosAddress,
      data?.user?.hashedUserId,
      evmAddress,
      injectiveAddress,
      neutronAddress,
      osmosisAddress,
      seiAddress,
      solanaAddress,
      suiAddress,
    ]
  )
}
