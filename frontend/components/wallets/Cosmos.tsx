import { ReactElement, ReactNode, useEffect } from 'react'
import { ChainProvider, useChainWallet } from '@cosmos-kit/react-lite'
import { assets, chains } from 'chain-registry'
import { wallets } from '@cosmos-kit/keplr-extension'
import { MainWalletBase } from '@cosmos-kit/core'
import { WalletButton, WalletConnectedButton } from './WalletButton'
import { fetchAmountAndProof } from 'utils/api'
import { useCosmosSignMessage } from 'hooks/useSignMessage'
import { SignButton } from './SignButton'
import { useTokenDispenserProvider } from '@components/TokenDispenserProvider'
import { useEligiblity } from '@components/Ecosystem/EligibilityProvider'
import { useCosmosAddress } from 'hooks/useAddress'

export const WALLET_NAME = 'keplr-extension'

export type ChainName = 'injective' | 'osmosis' | 'neutron'

type CosmosWalletProviderProps = {
  children: ReactNode
}

export function CosmosWalletProvider({
  children,
}: CosmosWalletProviderProps): ReactElement {
  return (
    <ChainProvider
      chains={chains}
      assetLists={assets}
      wallets={[...wallets] as unknown as MainWalletBase[]}
    >
      {children}
    </ChainProvider>
  )
}

type CosmosWalletButtonProps = {
  chainName: 'injective' | 'osmosis' | 'neutron'
  disableOnConnect?: boolean
}
export function CosmosWalletButton({
  chainName,
  disableOnConnect,
}: CosmosWalletButtonProps) {
  const chainWalletContext = useChainWallet(chainName, WALLET_NAME)
  const {
    address,
    isWalletConnecting,
    isWalletConnected,
    connect,
    logoUrl,
    isWalletNotExist,
    disconnect,
    isWalletDisconnected,
  } = chainWalletContext

  // Keplr doesn't provide any autoconnect feature
  // Implementing it here
  // When this component will render, it will check a localStorage key
  // to know if the wallet was previously connected. If it was, it will
  // connect with it again. Else, will do nothing
  // We only have to do this check once the component renders.
  // See Line 84, 99 to know how we are storing the status locally
  useEffect(() => {
    const key = getKeplrConnectionStatusKey(chainName)
    const connected = localStorage.getItem(key)
    if (connected === 'true') {
      connect()
    }
  }, [])

  // The initial value of `isWalletNotExist` is false.
  // When the user clicks on connect, the value of `isWalletNotExist` is first set to false,
  // doesn't matter what the previous value was. and if it the wallet doesn't exist the
  // value `isWalletNotExist` will change to true. Once, the value of `isWalletNotExist`
  // changes to true, this useEffect will redirect the user to the keplr webpage.
  useEffect(() => {
    if (isWalletNotExist) window.open('https://www.keplr.app/download')
  }, [isWalletNotExist])

  const { eligibility, setEligibility } = useEligiblity()

  // fetch the eligibility and store it
  useEffect(() => {
    ;(async () => {
      if (isWalletConnected === true && address !== undefined) {
        // Here, store locally that the wallet was connected
        localStorage.setItem(getKeplrConnectionStatusKey(chainName), 'true')

        // NOTE: we need to check if identity was previously stored
        // We can't check it using eligibility[address] === undefined
        // As, an undefined eligibility can be stored before.
        // Hence, we are checking if the key exists in the object
        if (address in eligibility) return
        else
          setEligibility(
            address,
            await fetchAmountAndProof(
              chainName === 'injective' ? 'injective' : 'cosmwasm',
              address
            )
          )
      }
      // TODO: if the effect has been triggered again, it will only because of isWalletConnected or address
      // i.e., the connected account has changed and hence set signedMessage to undefined
      // setSignedMessage(chainNametoEcosystem(chainName), undefined)
    })()
    if (isWalletDisconnected)
      localStorage.setItem(getKeplrConnectionStatusKey(chainName), 'false')
  }, [
    isWalletConnected,
    address,
    setEligibility,
    chainName,
    isWalletDisconnected,
    eligibility,
  ])

  return (
    <WalletButton
      address={address}
      connected={isWalletConnected}
      isLoading={isWalletConnecting}
      wallets={[{ name: 'keplr', icon: logoUrl, onSelect: connect }]}
      walletConnectedButton={(address: string) => (
        <WalletConnectedButton
          onClick={disconnect}
          address={address}
          disabled={disableOnConnect}
        />
      )}
    />
  )
}

// A Solana wallet must be connected before this component is rendered
// If not this button will be disabled
export function CosmosSignButton({ chainName }: { chainName: ChainName }) {
  const signMessageFn = useCosmosSignMessage(chainName)
  const tokenDispenser = useTokenDispenserProvider()
  const address = useCosmosAddress(chainName)

  if (address === undefined || tokenDispenser === undefined)
    return <SignButton disable />
  else
    return (
      <SignButton
        signMessageFn={signMessageFn}
        message={tokenDispenser.generateAuthorizationPayload()}
        solanaIdentity={tokenDispenser.claimant.toBase58()}
        ecosystemIdentity={address}
      />
    )
}

function getKeplrConnectionStatusKey(chainName: ChainName) {
  const KEPLR_CONNECTION_STATUS_KEY = 'keplr-local-storage-connection-key'
  return KEPLR_CONNECTION_STATUS_KEY + '-' + chainName
}
