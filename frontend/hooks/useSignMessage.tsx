import { useWallet as useAptosWallet } from '@aptos-labs/wallet-adapter-react'
import { useChainWallet } from '@cosmos-kit/react-lite'
import { useWalletKit } from '@mysten/wallet-kit'
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { useCallback } from 'react'
import { useAccount, useSignMessage as useWagmiSignMessage } from 'wagmi'

// SignMessageFn signs the message and returns it.
// It will return undefined:
// 1. If wallet is not connected.
// 2. If the user denies the sign request.
// 3. If there is some error. This is an edge case which happens rarely.
// We don't know of any special case we should handle right now.
type SignMessageFn = (message: string) => Promise<string | undefined>

// This hook returns a function to sign message for the Aptos wallet.
export function useAptosSignMessage(): SignMessageFn {
  const { signMessage, connected } = useAptosWallet()

  const signMessageCb = useCallback(
    async (message: string) => {
      try {
        if (connected === false) return

        const { signature } =
          (await signMessage({
            message,
            // TODO: do something for the nonce
            nonce: '1',
          })) ?? {}

        return signature as string | undefined
      } catch (e) {
        console.error(e)
      }
    },
    [connected, signMessage]
  )
  return signMessageCb
}

// This hook returns a function to sign message for the Cosmos wallet.
export function useCosmosSignMessage(
  chainName: string,
  walletName: string = 'keplr-extension'
): SignMessageFn {
  const { signArbitrary, address, isWalletConnected } = useChainWallet(
    chainName,
    walletName
  )
  const signMessageCb = useCallback(
    async (message: string) => {
      // Wallets have some weird edge cases. There may be a case where the
      // wallet is connected but the address is undefined.
      // Using both in this condition to handle those.
      try {
        if (address === undefined || isWalletConnected === false) return
        return (await signArbitrary(address, message)).signature
      } catch (e) {
        console.error(e)
      }
    },
    [signArbitrary, address, isWalletConnected]
  )

  return signMessageCb
}

// This hook returns a function to sign message for the EVM wallet.
export function useEVMSignMessage(): SignMessageFn {
  const { signMessageAsync } = useWagmiSignMessage()
  const { isConnected: isWalletConnected } = useAccount()
  const signMessageCb = useCallback(
    async (message: string) => {
      try {
        if (signMessageAsync === undefined || isWalletConnected === false)
          return
        return await signMessageAsync({ message })
      } catch (e) {
        console.error(e)
      }
    },
    [signMessageAsync, isWalletConnected]
  )

  return signMessageCb
}

// This hook returns a function to sign message for the Solana wallet.
export function useSolanaSignMessage(): SignMessageFn {
  const { connected, signMessage } = useSolanaWallet()
  const signMessageCb = useCallback(
    async (message: string) => {
      try {
        if (signMessage === undefined || connected === false) return
        const signature = await signMessage(Buffer.from(message))
        return Buffer.from(signature).toString('base64')
      } catch (e) {
        console.error(e)
      }
    },
    [signMessage, connected]
  )

  return signMessageCb
}

// This hook returns a function to sign message for the Sui wallet.
export function useSuiSignMessage(): SignMessageFn {
  const { signMessage, isConnected, currentWallet, status, currentAccount } =
    useWalletKit()

  const signMessageCb = useCallback(
    async (message: string) => {
      try {
        // Here is one edge case. Even if the wallet is connected the currentAccount
        // can be null and hence we can't sign a message. Calling signMessage when
        // currentAccount is null throws an error.
        if (isConnected === false || currentAccount === null) return
        const { signature } = await signMessage({
          message: Buffer.from(message),
        })
        return signature
      } catch (e) {
        console.error(e)
      }
    },
    [isConnected, signMessage, currentAccount]
  )

  return signMessageCb
}
