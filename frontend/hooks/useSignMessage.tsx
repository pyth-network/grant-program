import { useWallet as useAptosWallet } from '@aptos-labs/wallet-adapter-react'
import { useChainWallet } from '@cosmos-kit/react-lite'
import { useWalletKit } from '@mysten/wallet-kit'
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { removeLeading0x } from 'claim_sdk'
import {
  cosmosGetFullMessage,
  extractRecoveryId,
  getUncompressedPubkey,
} from 'claim_sdk/ecosystems/cosmos'
import {
  evmGetFullMessage,
  splitEvmSignature,
  uncompressedToEvmPubkey,
} from 'claim_sdk/ecosystems/evm'
import {
  suiGetFullMessage,
  splitSignatureAndPubkey,
} from 'claim_sdk/ecosystems/sui'
import { Hash } from '@keplr-wallet/crypto'
import { useCallback } from 'react'
import { useAccount, useSignMessage as useWagmiSignMessage } from 'wagmi'
import {
  SignedMessage,
  evmBuildSignedMessage,
} from 'claim_sdk/ecosystems/signatures'
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'

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
        const fullMessage = cosmosGetFullMessage(address, payload)
        const signature = Buffer.from(signatureBase64, 'base64')
        const publicKey = getUncompressedPubkey(
          Buffer.from(pub_key.value, 'base64')
        )
        if (chainName == 'injective') {
          return {
            publicKey: uncompressedToEvmPubkey(publicKey),
            signature,
            recoveryId: extractRecoveryId(
              signature,
              publicKey,
              Hash.keccak256(fullMessage)
            ),
            fullMessage,
          }
        } else {
          return {
            publicKey,
            signature,
            recoveryId: extractRecoveryId(
              signature,
              publicKey,
              Hash.sha256(fullMessage)
            ),
            fullMessage,
          }
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

export async function prepareSolanaOffchainMessage({
  message,
  encoding = "UTF-8",
  maxLength = 1212,
}: {
  message: Uint8Array;
  encoding: "ASCII" | "UTF-8";
  maxLength: 1212 | 65515;
}): Promise<Uint8Array> {
  // https://github.com/solana-labs/solana/blob/e80f67dd58b7fa3901168055211f346164efa43a/docs/src/proposals/off-chain-message-signing.md

  if (message.length > maxLength) {
    throw new Error(`Max message length (${maxLength}) exeeded!`);
  }
  const firstByte = new Uint8Array([255]);
  const domain8Bit = Uint8Array.from("solana offchain", (x) =>
    x.charCodeAt(0)
  );
  const headerVersion8Bit = new Uint8Array([0]);
  const headerFormat8Bit =
    encoding === "ASCII"
      ? new Uint8Array([0])
      : maxLength === 1212
      ? new Uint8Array([1])
      : new Uint8Array([2]);

  const headerLength16Bit = new Uint16Array([message.length]);
  const headerLength8Bit = new Uint8Array(
    headerLength16Bit.buffer,
    headerLength16Bit.byteOffset,
    headerLength16Bit.byteLength
  );

  const payload = Buffer.concat([
    firstByte,
    domain8Bit,
    headerVersion8Bit,
    headerFormat8Bit,
    headerLength8Bit,
    message,
  ]);

  return payload;
}



// This hook returns a function to sign message for the Solana wallet.
export function useSolanaSignMessage(): SignMessageFn {
  const { connected, signMessage, publicKey, signTransaction } = useSolanaWallet()
  const signMessageCb = useCallback(
    async (payload: string) => {
      try {
        if (signMessage === undefined || !signTransaction || connected === false || !publicKey)
          return
        const signBuffer = Buffer.concat([
          Buffer.alloc(1, 'ff'),
          Buffer.from('solana offchain', 'utf-8'),
          Buffer.from('00', 'hex'),
          Buffer.from('01', 'hex'),
          Buffer.from('0001', 'hex'),
          Buffer.from('a', 'utf-8'),
        ])


        console.log(signBuffer)
        console.log(signBuffer.length)
         let transaction = new Transaction();
         transaction.add(new TransactionInstruction({
            keys : [],
            data : Buffer.from(''),
            programId: PublicKey.unique()
         }));
         transaction.recentBlockhash = (await new Connection("http://mainnet.xyz.pyth.network").getLatestBlockhash()).blockhash;
         transaction.feePayer = publicKey; 
         const messagePayload = await prepareSolanaOffchainMessage({message : Buffer.from("test", "utf-8"), encoding: "ASCII", maxLength: 1212});
         await signMessage(messagePayload)
         console.log("SUCCESS")
        return {
          publicKey: publicKey.toBytes(),
          signature: Buffer.from(''),
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
