import {
  useAptosAddress,
  useCosmosAddress,
  useEVMAddress,
  useSolanaAddress,
  useSuiAddress,
} from './useAddress'
import { useSession } from 'next-auth/react'
import { Ecosystem } from '@components/Ecosystem'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSeiConnectedWalletName } from '@components/wallets/Sei'

// It will return a function that can be used to get the identity of a given ecosystem
// The function will return the identity if the ecosystem is connected
// Else it will return undefined
export function useGetEcosystemIdentity() {
  const aptosAddress = useAptosAddress()
  const evmAddress = useEVMAddress()
  const injectiveAddress = useCosmosAddress('injective')
  const osmosisAddress = useCosmosAddress('osmosis')
  const neutronAddress = useCosmosAddress('neutron')
  const seiAddress = useCosmosAddress(
    'sei',
    getSeiConnectedWalletName() ?? undefined
  )
  const solanaAddress = useSolanaAddress()
  const suiAddress = useSuiAddress()
  const { data } = useSession()

  const [discordHashedUserId, setDiscordHashedUserId] = useState<
    string | undefined
  >(undefined)

  useEffect(() => {
    fetchHashedUserId()

    async function fetchHashedUserId() {
      if (data?.user?.id) {
        const resp = await (
          await fetch(`/api/grant/v1/hash_discord_uid`)
        ).json()
        setDiscordHashedUserId(resp.hash)
      } else {
        setDiscordHashedUserId(undefined)
      }
    }
  }, [data?.user?.id])

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
          return discordHashedUserId
      }
    },
    [
      aptosAddress,
      discordHashedUserId,
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
