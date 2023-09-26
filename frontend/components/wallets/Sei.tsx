import { useEffect, useState } from 'react'
import { useChainWallet } from '@cosmos-kit/react-lite'
import { WalletButton, WalletConnectedButton } from './WalletButton'

import keplr from '@images/keplr.svg'
import compass from '@images/compass.svg'

type SeiWalletButtonProps = {
  disableOnConnect?: boolean
}
export function SeiWalletButton({ disableOnConnect }: SeiWalletButtonProps) {
  const compassChainWalletctx = useChainWallet('sei', 'compass-extension')
  const keplrChainWalletctx = useChainWallet('sei', 'keplr-extension')
  const [icon, setIcon] = useState<string>()

  // Cosmos wallets doesn't provide any autoconnect feature
  // Implementing it here
  // When this component will render, it will check a localStorage key
  // to know if the wallet was previously connected. If it was, it will
  // connect with it again. Else, will do nothing
  // We only have to do this check once the component renders.
  // See Line 84, 99 to know how we are storing the status locally
  useEffect(() => {
    const connectedWallet = getSeiConnectedWalletName()
    if (connectedWallet === 'keplr-extension') {
      keplrChainWalletctx.connect()
    } else if (connectedWallet === 'compass-extension') {
      compassChainWalletctx.connect()
    }
  }, [])

  useEffect(() => {
    if (
      keplrChainWalletctx.isWalletConnected === true &&
      keplrChainWalletctx?.address !== undefined
    ) {
      setSeiConnectedWalletName('keplr-extension')
      setIcon(keplr)
    } else if (
      compassChainWalletctx.isWalletConnected === true &&
      compassChainWalletctx?.address !== undefined
    ) {
      setSeiConnectedWalletName('compass-extension')
      setIcon(compass)
    }

    if (
      keplrChainWalletctx.isWalletDisconnected &&
      compassChainWalletctx.isWalletDisconnected
    ) {
      setSeiConnectedWalletName(null)
      setIcon(undefined)
    }
  }, [keplrChainWalletctx, compassChainWalletctx])

  return (
    <WalletButton
      address={keplrChainWalletctx.address || compassChainWalletctx.address}
      connected={
        keplrChainWalletctx.isWalletConnected ||
        compassChainWalletctx.isWalletConnected
      }
      isLoading={
        keplrChainWalletctx.isWalletConnecting ||
        compassChainWalletctx.isWalletConnecting
      }
      wallets={[
        {
          name: 'keplr',
          icon: keplr,
          onSelect: () => {
            if (keplrChainWalletctx.isWalletNotExist) {
              window.open('https://www.keplr.app/download')
            } else keplrChainWalletctx.connect()
          },
        },
        {
          name: 'compass',
          icon: compass,
          onSelect: () => {
            if (compassChainWalletctx.isWalletNotExist) {
              window.open(
                'https://chrome.google.com/webstore/detail/compass-wallet-for-sei/anokgmphncpekkhclmingpimjmcooifb'
              )
            } else compassChainWalletctx.connect()
          },
        },
      ]}
      walletConnectedButton={(address: string) => (
        <WalletConnectedButton
          onClick={() => {
            const wallet = getSeiConnectedWalletName()
            if (wallet === 'keplr-extension') keplrChainWalletctx.disconnect()
            else if (wallet === 'compass-extension')
              compassChainWalletctx.disconnect()
          }}
          address={address}
          disabled={disableOnConnect}
          icon={icon}
        />
      )}
    />
  )
}

type StoredWallet = 'keplr-extension' | 'compass-extension' | null

function setSeiConnectedWalletName(wallet: StoredWallet) {
  const key = getSeiConnectionStatusKey()
  if (typeof window === 'undefined') return null
  if (wallet === null) localStorage.removeItem(key)
  else localStorage.setItem(key, wallet)
}

// It returns the connected wallet name if connected
// else null
export function getSeiConnectedWalletName(): StoredWallet {
  const key = getSeiConnectionStatusKey()
  if (typeof window === 'undefined') return null
  return localStorage.getItem(key) as StoredWallet
}

function getSeiConnectionStatusKey() {
  return 'sei-local-storage-connection-key'
}
