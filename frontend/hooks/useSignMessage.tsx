import { useWallet as useAptosWallet } from '@aptos-labs/wallet-adapter-react'
import { useChainWallet } from '@cosmos-kit/react-lite'
import { useWalletKit } from '@mysten/wallet-kit'
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { removeLeading0x } from 'claim_sdk'
import {
  suiGetFullMessage,
  splitSignatureAndPubkey,
} from 'claim_sdk/ecosystems/sui'
import { useCallback } from 'react'
import { useAccount, useSignMessage as useWagmiSignMessage } from 'wagmi'
import {
  SignedMessage,
  evmBuildSignedMessage,
  cosmwasmBuildSignedMessage,
} from 'claim_sdk/ecosystems/signatures'

// SignMessageFn signs the message and returns it.
// It will return undefined:
// 1. If wallet is not connected.
// 2. If the user denies the sign request.
// 3. If there is some error. This is an edge case which happens rarely.
// We don't know of any special case we should handle right now.
export type SignMessageFn = (
  payload: string
) => Promise<SignedMessage | undefined>

// This hook returns a function to sign message for the Aptos wallet.
export function useAptosSignMessage(nonce = 'nonce'): SignMessageFn {
  const { signMessage, connected, account } = useAptosWallet()

  const signMessageCb = useCallback(
    async (payload: string) => {
      try {
        if (connected === false || !account) return

        const { signature, fullMessage } =
          (await signMessage({
            message: payload,
            nonce,
          })) ?? {}

        // Discard multisigs
        if (
          typeof signature != 'string' ||
          typeof account.publicKey != 'string' ||
          !fullMessage
        )
          return
        return {
          publicKey: Buffer.from(removeLeading0x(account.publicKey), 'hex'),
          signature: Buffer.from(signature, 'hex'),
          recoveryId: undefined,
          fullMessage: Buffer.from(fullMessage, 'utf-8'),
        }
      } catch (e) {
        console.error(e)
      }
    },
    [connected, signMessage, nonce]
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
    async (payload: string) => {
      // Wallets have some weird edge cases. There may be a case where the
      // wallet is connected but the address is undefined.
      // Using both in this condition to handle those.
      try {
        if (address === undefined || isWalletConnected === false) return

        const { pub_key, signature: signatureBase64 } = await signArbitrary(
          address,
          payload
        )
        return cosmwasmBuildSignedMessage(
          pub_key,
          address,
          payload,
          signatureBase64
        )
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
  const { isConnected: isWalletConnected, address } = useAccount()
  const signMessageCb = useCallback(
    async (payload: string) => {
      try {
        if (
          signMessageAsync === undefined ||
          isWalletConnected === false ||
          !address
        )
          return
        const response = await signMessageAsync({ message: payload })
        return evmBuildSignedMessage(response, address, payload)
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
  const { connected, signMessage, publicKey } = useSolanaWallet()
  const signMessageCb = useCallback(
    async (payload: string) => {
      try {
        if (signMessage === undefined || connected === false || !publicKey)
          return
        const signature = await signMessage(Buffer.from(payload))
        return {
          publicKey: publicKey.toBytes(),
          signature: signature,
          recoveryId: undefined,
          fullMessage: Buffer.from(payload, 'utf-8'),
        }
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
  const { signMessage, isConnected, currentAccount } = useWalletKit()

  const signMessageCb = useCallback(
    async (payload: string) => {
      try {
        // Here is one edge case. Even if the wallet is connected the currentAccount
        // can be null and hence we can't sign a message. Calling signMessage when
        // currentAccount is null throws an error.
        if (isConnected === false || currentAccount === null) return
        const response = (
          await signMessage({
            message: Buffer.from(payload),
          })
        ).signature
        const [signature, publicKey] = splitSignatureAndPubkey(
          Buffer.from(response, 'base64')
        )
        return {
          publicKey,
          signature,
          recoveryId: undefined,
          fullMessage: suiGetFullMessage(payload),
        }
      } catch (e) {
        console.error(e)
      }
    },
    [isConnected, signMessage, currentAccount]
  )

  return signMessageCb
}
