import { useWalletKit } from '@mysten/wallet-kit'
import { WalletButton, WalletConnectedButton } from './WalletButton'

export function SuiWalletButton() {
  const {
    currentAccount,
    disconnect,
    isConnected,
    wallets,
    connect,
    isConnecting,
    currentWallet,
  } = useWalletKit()

  return (
    <WalletButton
      address={currentAccount?.address}
      connected={isConnected}
      isLoading={isConnecting}
      wallets={wallets.map((wallet) => ({
        name: wallet.name,
        icon: wallet.icon,
        connect: () => connect(wallet.name),
      }))}
      walletConnectedButton={(address: string) => (
        <WalletConnectedButton
          onClick={disconnect}
          address={address}
          icon={currentWallet?.icon}
        />
      )}
    />
  )
}
