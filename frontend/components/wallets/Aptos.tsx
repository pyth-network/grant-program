import {
  AptosWalletAdapterProvider,
  Wallet,
  useWallet,
} from '@aptos-labs/wallet-adapter-react'
import { PetraWallet } from 'petra-plugin-wallet-adapter'
import { ReactElement, ReactNode, useCallback, useEffect, useMemo } from 'react'
import { WalletButton, WalletConnectedButton } from './WalletButton'
import { Ecosystem, useEcosystem } from '@components/EcosystemProvider'
import { fetchAmountAndProof } from 'utils/api'
import { useAptosSignMessage } from 'hooks/useSignMessage'
import { SignButton } from './SignButton'
import { useTokenDispenserProvider } from '@components/TokenDispenserProvider'
import { useEligiblity } from '@components/Ecosystem/EligibilityProvider'

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

type AptosWalletButtonProps = {
  disableOnConnect?: boolean
}
export function AptosWalletButton({
  disableOnConnect,
}: AptosWalletButtonProps) {
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

  const { eligibility, setEligibility } = useEligiblity()

  // fetch the eligibility and store it
  useEffect(() => {
    ;(async () => {
      if (connected === true && account?.address !== undefined) {
        // NOTE: we need to check if identity was previously stored
        // We can't check it using eligibility[account?.address] === undefined
        // As, an undefined eligibility can be stored before.
        // Hence, we are checking if the key exists in the object
        if (account?.address in eligibility) return
        else
          setEligibility(
            account?.address,
            await fetchAmountAndProof('aptos', account?.address)
          )
      }
      // TODO: if the effect has been triggered again, it will only because of connected or account?.address
      // i.e., the connected account has changed and hence set signedMessage to undefined
      // setSignedMessage(Ecosystem.APTOS, undefined)
    })()
  }, [connected, account?.address, setEligibility, eligibility])

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
          disabled={disableOnConnect}
        />
      )}
    />
  )
}

// A Solana wallet must be connected before this component is rendered
// If not this button will be disabled
export function AptosSignButton() {
  const signMessageFn = useAptosSignMessage()
  const tokenDispenser = useTokenDispenserProvider()
  return (
    <SignButton
      signMessageFn={signMessageFn}
      ecosystem={Ecosystem.APTOS}
      message={tokenDispenser?.generateAuthorizationPayload() ?? ''}
      disable={tokenDispenser === undefined}
    />
  )
}
