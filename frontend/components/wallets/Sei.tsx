import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useChainWallet } from '@cosmos-kit/react-lite'
import { WalletButton, WalletConnectedButton } from './WalletButton'

import keplr from '@images/keplr.svg'
import compass from '@images/compass.svg'

type StoredWallet = 'keplr-extension' | 'compass-extension' | null

type SeiContextType = {
  connectedSeiWallet: StoredWallet
  setConnectedSeiWallet: (wallet: StoredWallet) => void
}
const SeiContext = createContext<SeiContextType | undefined>(undefined)

const LOCAL_STORAGE_SEI_WALLET_KEY = 'sei-local-storage-connection-key'
// we need a provider to be able to sync with local storage
export function SeiProvider({ children }: { children: ReactNode }) {
  const [connectedWallet, setConnectedWallet] = useState<StoredWallet>(null)

  // On first render read the connected wallet name
  useEffect(() => {
    setConnectedWallet(
      localStorage.getItem(LOCAL_STORAGE_SEI_WALLET_KEY) as StoredWallet
    )
  }, [])

  const setConnectedSeiWallet = useCallback((wallet: StoredWallet) => {
    if (typeof window === 'undefined') return null
    if (wallet === null) {
      localStorage.removeItem(LOCAL_STORAGE_SEI_WALLET_KEY)
      return
    }
    localStorage.setItem(LOCAL_STORAGE_SEI_WALLET_KEY, wallet)
    setConnectedWallet(wallet)
  }, [])

  return (
    <SeiContext.Provider
      value={{ connectedSeiWallet: connectedWallet, setConnectedSeiWallet }}
    >
      {children}
    </SeiContext.Provider>
  )
}

export function useSeiWalletContext() {
  const ctx = useContext(SeiContext)
  if (ctx === undefined)
    throw new Error('Hook should be called under the provider')

  return ctx
}

type SeiWalletButtonProps = {
  disableOnConnect?: boolean
}
export function SeiWalletButton({ disableOnConnect }: SeiWalletButtonProps) {
  const compassChainWalletctx = useChainWallet('sei', 'compass-extension')
  const keplrChainWalletctx = useChainWallet('sei', 'keplr-extension')
  const [icon, setIcon] = useState<string>()
  const { connectedSeiWallet, setConnectedSeiWallet } = useSeiWalletContext()

  // Cosmos wallets doesn't provide any autoconnect feature
  // Implementing it here
  // When this component will render, it will check a localStorage key
  // to know if the wallet was previously connected. If it was, it will
  // connect with it again. Else, will do nothing
  // We only have to do this check once the component renders.
  // See Line 84, 99 to know how we are storing the status locally
  useEffect(() => {
    if (connectedSeiWallet === 'keplr-extension') {
      keplrChainWalletctx.connect()
    } else if (connectedSeiWallet === 'compass-extension') {
      compassChainWalletctx.connect()
    }
  }, [])

  useEffect(() => {
    if (
      keplrChainWalletctx.isWalletConnected === true &&
      keplrChainWalletctx?.address !== undefined
    ) {
      setConnectedSeiWallet('keplr-extension')
      setIcon(keplr)
    } else if (
      compassChainWalletctx.isWalletConnected === true &&
      compassChainWalletctx?.address !== undefined
    ) {
      setConnectedSeiWallet('compass-extension')
      setIcon(compass)
    }

    if (
      keplrChainWalletctx.isWalletDisconnected &&
      compassChainWalletctx.isWalletDisconnected
    ) {
      setConnectedSeiWallet(null)
      setIcon(undefined)
    }
  }, [keplrChainWalletctx, compassChainWalletctx, setConnectedSeiWallet])

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
            if (connectedSeiWallet === 'keplr-extension')
              keplrChainWalletctx.disconnect()
            else if (connectedSeiWallet === 'compass-extension')
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
