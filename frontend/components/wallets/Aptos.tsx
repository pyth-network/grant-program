import {
  AptosWalletAdapterProvider,
  Wallet,
  useWallet,
} from '@aptos-labs/wallet-adapter-react'
import { PetraWallet } from 'petra-plugin-wallet-adapter'
import { ReactElement, ReactNode, useCallback, useEffect, useMemo } from 'react'
import { WalletButton, WalletConnectedButton } from './WalletButton'
import { ECOSYSTEM, useEcosystem } from '@components/EcosystemProvider'
import { fetchAmountAndProof } from 'utils/api'
import { useAptosSignMessage } from 'hooks/useSignMessage'
import { SignButton } from './SignButton'

type AptosWalletProviderProps = {
  children: ReactNode
}

export function AptosWalletProvider({
  children,
}: AptosWalletProviderProps): ReactElement {
  const aptosWallets = useMemo(() => [new PetraWallet()], [])

  return (
    <AptosWalletAdapterProvider plugins={aptosWallets} autoConnect>
      {children}
    </AptosWalletAdapterProvider>
  )
}

export function AptosWalletButton() {
  const {
    disconnect,
    account,
    connected,
    wallet,
    isLoading,
    connect,
    wallets,
  } = useWallet()

  // If the wallet is connected or loadable, try to connect to it.
  // Else, redirect user to the wallet webpage.
  const onSelect = useCallback(
    (wallet: Wallet) => {
      if (wallet.readyState === 'Installed' || wallet.readyState === 'Loadable')
        connect(wallet.name)
      else if (wallet.readyState === 'NotDetected')
        window.open(wallet.url, '_blank')
    },
    [connect]
  )

  const { setEligibility } = useEcosystem()

  // fetch the eligibility and store it
  useEffect(() => {
    ;(async () => {
      if (connected === true && account?.address !== undefined) {
        const eligibility = await fetchAmountAndProof('aptos', account?.address)
        setEligibility(ECOSYSTEM.APTOS, eligibility)
      } else {
        setEligibility(ECOSYSTEM.APTOS, undefined)
      }
    })()
  }, [connected, account?.address, setEligibility])

  return (
    <WalletButton
      address={account?.address}
      connected={connected}
      isLoading={isLoading}
      wallets={wallets.map((wallet) => ({
        icon: wallet.icon,
        name: wallet.name,
        onSelect: () => onSelect(wallet),
      }))}
      walletConnectedButton={(address: string) => (
        <WalletConnectedButton
          onClick={disconnect}
          address={address}
          icon={wallet?.icon}
        />
      )}
    />
  )
}

export function AptosSignButton() {
  const signMessageFn = useAptosSignMessage()
  // TODO: update this message
  return (
    <SignButton
      signMessageFn={signMessageFn}
      ecosystem={ECOSYSTEM.APTOS}
      message={'solana message'}
    />
  )
}
