import { useWalletKit } from '@mysten/wallet-kit'
import { WalletButton, WalletConnectedButton } from './WalletButton'
import { useEffect, useMemo } from 'react'
import { useEcosystem, Ecosystem } from '@components/EcosystemProvider'
import { fetchAmountAndProof } from 'utils/api'
import { useSuiSignMessage } from 'hooks/useSignMessage'
import { SignButton } from './SignButton'

export function SuiWalletButton() {
  const {
    currentAccount,
    disconnect,
    isConnected,
    wallets: detectedWallets,
    connect,
    isConnecting,
    currentWallet,
  } = useWalletKit()

  // Sui sdk automatically detects any installed wallets.
  // If none is installed the detectedWallets array will be empty, and hence
  // we are returning a custom list of wallets - sui, martian
  // to implement the install wallet flow.
  // Note that, if only one wallet is installed, only that will be shown.
  // We won't be showing wallets that can be installed.
  const wallets = useMemo(() => {
    if (detectedWallets.length !== 0)
      return detectedWallets.map((wallet) => ({
        name: wallet.name,
        icon: wallet.icon,
        onSelect: () => connect(wallet.name),
      }))
    else
      return [
        {
          name: 'Sui Wallet',
          icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzIiIGhlaWdodD0iNzIiIHZpZXdCb3g9IjAgMCA3MiA3MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjcyIiBoZWlnaHQ9IjcyIiByeD0iMTYiIGZpbGw9IiM2RkJDRjAiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0yMC40MjEzIDUyLjc4MzhDMjMuNjQ5NiA1OC4zNzYgMjkuNDMyMSA2MS43MTQyIDM1Ljg4ODggNjEuNzE0MkM0Mi4zNDU1IDYxLjcxNDIgNDguMTI3IDU4LjM3NiA1MS4zNTY0IDUyLjc4MzhDNTQuNTg0OCA0Ny4xOTI2IDU0LjU4NDggNDAuNTE2MyA1MS4zNTY0IDM0LjkyNEwzNy43NTI0IDExLjM2MTVDMzYuOTI0MSA5LjkyNzAxIDM0Ljg1MzUgOS45MjcwMSAzNC4wMjUzIDExLjM2MTVMMjAuNDIxMyAzNC45MjRDMTcuMTkyOSA0MC41MTUyIDE3LjE5MjkgNDcuMTkxNSAyMC40MjEzIDUyLjc4MzhaTTMyLjA1NjYgMjIuNTcxM0wzNC45NTcxIDE3LjU0NzRDMzUuMzcxMiAxNi44MzAxIDM2LjQwNjUgMTYuODMwMSAzNi44MjA2IDE3LjU0NzRMNDcuOTc5MSAzNi44NzQ4QzUwLjAyOTEgNDAuNDI1NCA1MC40MTM5IDQ0LjUzNSA0OS4xMzM1IDQ4LjI5NTRDNDkuMDAwMiA0Ny42ODE5IDQ4LjgxMzggNDcuMDU0MiA0OC41NjI2IDQ2LjQyMDFDNDcuMDIxMyA0Mi41MzA0IDQzLjUzNjMgMzkuNTI4OSAzOC4yMDIzIDM3LjQ5ODJDMzQuNTM1MSAzNi4xMDcxIDMyLjE5NDMgMzQuMDYxMyAzMS4yNDMxIDMxLjQxNzFDMzAuMDE4IDI4LjAwODkgMzEuMjk3NiAyNC4yOTI0IDMyLjA1NjYgMjIuNTcxM1pNMjcuMTEwNyAzMS4xMzc5TDIzLjc5ODYgMzYuODc0OEMyMS4yNzQ4IDQxLjI0NTkgMjEuMjc0OCA0Ni40NjQxIDIzLjc5ODYgNTAuODM1M0MyNi4zMjIzIDU1LjIwNjQgMzAuODQxMyA1Ny44MTUgMzUuODg4OCA1Ny44MTVDMzkuMjQxMyA1Ny44MTUgNDIuMzYxNSA1Ni42NjMzIDQ0LjgxODQgNTQuNjA4OEM0NS4xMzg4IDUzLjgwMjEgNDYuMTMxIDUwLjg0OTIgNDQuOTA1MiA0Ny44MDU4QzQzLjc3MyA0NC45OTU0IDQxLjA0ODIgNDIuNzUxOSAzNi44MDYxIDQxLjEzNkMzMi4wMTEgMzkuMzE3MSAyOC44OTU4IDM2LjQ3NzQgMjcuNTQ4NiAzMi42OTg0QzI3LjM2MzEgMzIuMTc4MSAyNy4yMTg5IDMxLjY1NjggMjcuMTEwNyAzMS4xMzc5WiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
          onSelect: () =>
            window.open(
              'https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil',
              '_blank'
            ),
        },
        {
          name: 'Martian Sui Wallet',
          icon: 'https://cdn.martianwallet.xyz/assets/icon.png',
          onSelect: () =>
            window.open('https://martianwallet.xyz/sui-wallet', '_blank'),
        },
      ]
  }, [connect, detectedWallets])

  const { setEligibility, setSignedMessage } = useEcosystem()

  // fetch the eligibility and store it
  useEffect(() => {
    ;(async () => {
      if (isConnected === true && currentAccount?.address !== undefined) {
        const eligibility = await fetchAmountAndProof(
          'sui',
          currentAccount?.address
        )
        setEligibility(Ecosystem.SUI, eligibility)
      } else {
        setEligibility(Ecosystem.SUI, undefined)
      }
      // if the effect has been triggered again, it will only because of isConnected or currentAccount?.address
      // i.e., the connected account has changed and hence set signedMessage to undefined
      setSignedMessage(Ecosystem.SUI, undefined)
    })()
  }, [isConnected, currentAccount?.address, setEligibility, setSignedMessage])

  return (
    <WalletButton
      address={currentAccount?.address}
      connected={isConnected}
      isLoading={isConnecting}
      wallets={wallets}
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

export function SuiSignButton() {
  const signMessageFn = useSuiSignMessage()
  // TODO: update this message
  return (
    <SignButton
      signMessageFn={signMessageFn}
      ecosystem={Ecosystem.SUI}
      message={'solana message'}
    />
  )
}
