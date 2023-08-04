import { useWalletKit } from '@mysten/wallet-kit'
import {
  WalletButton,
  WalletConnectedButton,
  WalletLoadingButton,
  WalletModalButton,
} from './Common'

export function SuiWalletButton() {
  const {
    currentAccount,
    disconnect,
    isConnected,
    wallets,
    connect,
    isConnecting,
  } = useWalletKit()

  return (
    <WalletButton
      address={currentAccount?.address}
      connected={isConnected}
      isLoading={isConnecting}
      walletModalButton={
        <WalletModalButton
          connect={connect}
          wallets={wallets.map((wallet) => ({
            name: wallet.name,
            icon: wallet.icon,
            connectId: wallet.name,
          }))}
        />
      }
      walletLoadingButton={<WalletLoadingButton />}
      walletConnectedButton={(address: string) => (
        <WalletConnectedButton disconnect={disconnect} address={address} />
      )}
    />
  )
}
