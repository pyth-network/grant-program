import { ReactElement, ReactNode, useEffect } from 'react'
import { ChainProvider, useChainWallet } from '@cosmos-kit/react-lite'
import { assets, chains } from 'chain-registry'
import { wallets } from '@cosmos-kit/keplr-extension'
import { MainWalletBase } from '@cosmos-kit/core'
import { WalletButton, WalletConnectedButton } from './WalletButton'
import { fetchAmountAndProof } from 'utils/api'
import { Ecosystem, useEcosystem } from '@components/EcosystemProvider'
import { useCosmosSignMessage } from 'hooks/useSignMessage'
import { SignButton } from './SignButton'

const walletName = 'keplr-extension'

type ChainName = 'injective' | 'osmosis' | 'neutron'

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
  const chainWalletContext = useChainWallet(chainName, walletName)
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

  const { setEligibility, setSignedMessage } = useEcosystem()

  // fetch the eligibility and store it
  useEffect(() => {
    ;(async () => {
      if (isWalletConnected === true && address !== undefined) {
        // Here, store locally that the wallet was connected
        localStorage.setItem(getKeplrConnectionStatusKey(chainName), 'true')

        const eligibility = await fetchAmountAndProof(
          chainName === 'injective' ? 'injective' : 'cosmwasm',
          address
        )
        setEligibility(chainNametoEcosystem(chainName), eligibility)
      } else {
        setEligibility(chainNametoEcosystem(chainName), undefined)
      }
      // if the effect has been triggered again, it will only because of isWalletConnected or address
      // i.e., the connected account has changed and hence set signedMessage to undefined
      setSignedMessage(chainNametoEcosystem(chainName), undefined)
    })()
    if (isWalletDisconnected)
      localStorage.setItem(getKeplrConnectionStatusKey(chainName), 'false')
  }, [
    isWalletConnected,
    address,
    setEligibility,
    chainName,
    setSignedMessage,
    isWalletDisconnected,
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

function chainNametoEcosystem(chainName: ChainName): Ecosystem {
  if (chainName === 'injective') return Ecosystem.INJECTIVE
  else if (chainName === 'osmosis') return Ecosystem.OSMOSIS
  else return Ecosystem.NEUTRON
}

export function CosmosSignButton({ chainName }: { chainName: ChainName }) {
  const signMessageFn = useCosmosSignMessage(chainName)
  // TODO: update this message
  return (
    <SignButton
      signMessageFn={signMessageFn}
      ecosystem={chainNametoEcosystem(chainName)}
      message={'solana message'}
    />
  )
}

function getKeplrConnectionStatusKey(chainName: ChainName) {
  const KEPLR_CONNECTION_STATUS_KEY = 'keplr-local-storage-connection-key'
  return KEPLR_CONNECTION_STATUS_KEY + '-' + chainName
}
