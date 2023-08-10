import { useWallet as useAptosWallet } from '@aptos-labs/wallet-adapter-react'
import { useChainWallet } from '@cosmos-kit/react-lite'
import { useWalletKit } from '@mysten/wallet-kit'
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { removeLeading0x } from 'claim_sdk'
import { getUncompressedPubkey } from 'claim_sdk/ecosystems/cosmos'
import { splitEvmSignature } from 'claim_sdk/ecosystems/evm'
import { splitSignatureAndPubkey } from 'claim_sdk/ecosystems/sui'
import { useCallback } from 'react'
import { useAccount, useSignMessage as useWagmiSignMessage } from 'wagmi'

// SignMessageFn signs the message and returns it.
// It will return undefined:
// 1. If wallet is not connected.
// 2. If the user denies the sign request.
// 3. If there is some error. This is an edge case which happens rarely.
// We don't know of any special case we should handle right now.
type SignMessageFn = (message: string) => Promise<SignedMessage | undefined>

type SignedMessage = {
  publicKey: Uint8Array
  signature: Uint8Array
  recoveryId: number | undefined
}

// This hook returns a function to sign message for the Aptos wallet.
export function useAptosSignMessage(nonce = 'nonce'): SignMessageFn {
  const { signMessage, connected, account } = useAptosWallet()

  const signMessageCb = useCallback(
    async (message: string) => {
      try {
        if (connected === false || !account) return

        const { signature } =
          (await signMessage({
            message,
            nonce,
          })) ?? {}

        // Discard multisigs
        if (
          typeof signature != 'string' ||
          typeof account.publicKey != 'string'
        )
          return
        return {
          publicKey: new Uint8Array(
            Buffer.from(removeLeading0x(account.publicKey), 'hex')
          ),
          signature: new Uint8Array(Buffer.from(signature, 'hex')),
          recoveryId: undefined,
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
    async (message: string) => {
      // Wallets have some weird edge cases. There may be a case where the
      // wallet is connected but the address is undefined.
      // Using both in this condition to handle those.
      try {
        if (address === undefined || isWalletConnected === false) return

        const { pub_key, signature } = await signArbitrary(address, message)

        return {
          publicKey: getUncompressedPubkey(
            new Uint8Array(Buffer.from(pub_key.value, 'base64'))
          ),
          signature: new Uint8Array(Buffer.from(signature, 'base64')),
          recoveryId: 0, // TO DO : compute this
        }
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
    async (message: string) => {
      try {
        if (
          signMessageAsync === undefined ||
          isWalletConnected === false ||
          !address
        )
          return
        const response = await signMessageAsync({ message })
        const [signature, recoveryId] = splitEvmSignature(response)
        return {
          publicKey: Buffer.from(removeLeading0x(address), 'hex'),
          signature,
          recoveryId,
        }
      } catch (e) {
        console.error(e)
      }
    },
    [signMessageAsync, isWalletConnected]
  )

  return signMessageCb
}

// // This hook returns a function to sign message for the Solana wallet.
export function useSolanaSignMessage(): SignMessageFn {
  const { connected, signMessage, publicKey } = useSolanaWallet()
  const signMessageCb = useCallback(
    async (message: string) => {
      try {
        if (signMessage === undefined || connected === false || !publicKey)
          return
        const signature = await signMessage(Buffer.from(message))
        console.log(signature)
        return {
          publicKey: publicKey.toBytes(),
          signature: signature,
          recoveryId: undefined,
        }
      } catch (e) {
        console.error(e)
      }
    },
    [signMessage, connected]
  )

  return signMessageCb
}

// // This hook returns a function to sign message for the Sui wallet.
export function useSuiSignMessage(): SignMessageFn {
  const { signMessage, isConnected, currentAccount } = useWalletKit()

  const signMessageCb = useCallback(
    async (message: string) => {
      try {
        // Here is one edge case. Even if the wallet is connected the currentAccount
        // can be null and hence we can't sign a message. Calling signMessage when
        // currentAccount is null throws an error.
        if (isConnected === false || currentAccount === null) return
        const response = (
          await signMessage({
            message: Buffer.from(message),
          })
        ).signature
        const [signature, publicKey] = splitSignatureAndPubkey(
          Buffer.from(response, 'base64')
        )
        return {
          publicKey,
          signature,
          recoveryId: undefined,
        }
      } catch (e) {
        console.error(e)
      }
    },
    [isConnected, signMessage, currentAccount]
  )

  return signMessageCb
}
