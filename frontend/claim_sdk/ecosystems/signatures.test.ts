import { ethers } from 'ethers'
import { SignedMessage, evmBuildSignedMessage } from './signatures'
import {
  LAMPORTS_PER_SOL,
  Secp256k1Program,
  Transaction,
} from '@solana/web3.js'
import { secp256k1 } from '@noble/curves/secp256k1'
import { uncompressedToEvmPubkey } from './evm'
import { Hash } from '@keplr-wallet/crypto'
import { removeLeading0x } from '..'
import * as anchor from '@coral-xyz/anchor'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import fs from 'fs'
import { Keplr as IKeplrWallet } from '@keplr-wallet/types'
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing'
import {
  cosmosGetFullMessage,
  extractRecoveryId,
  getUncompressedPubkey,
} from './cosmos'
import { makeADR36AminoSignDoc, serializeSignDoc } from '@keplr-wallet/cosmos'
import { Secp256k1HdWallet } from '@cosmjs/amino'
import path from 'path'

interface TestWallet {
  signMessage(payload: string): Promise<SignedMessage>
  address(): string
}

export class TestEvmWallet implements TestWallet {
  constructor(readonly wallet: ethers.Wallet) {}
  static fromKeyfile(keyFile: string): TestEvmWallet {
    const jsonContent = fs.readFileSync(keyFile, 'utf8')
    const privateKey = JSON.parse(jsonContent).privateKey
    return new TestEvmWallet(new ethers.Wallet(privateKey))
  }

  async signMessage(payload: string): Promise<SignedMessage> {
    const response = await this.wallet.signMessage(payload)
    const signedMessage = evmBuildSignedMessage(
      response as `0x${string}`,
      this.wallet.address as `0x${string}`,
      payload
    )
    return signedMessage
  }

  public address(): string {
    return this.wallet.address
  }
}
export class TestCosmWasmWallet implements TestWallet {
  private addressStr: string | undefined
  private pubkey: Uint8Array | undefined
  private _chainName: string | undefined
  constructor(readonly wallet: Secp256k1HdWallet) {}
  static async fromKeyFile(
    keyFile: string,
    chainName: string
  ): Promise<TestCosmWasmWallet> {
    const jsonContent = fs.readFileSync(keyFile, 'utf8')
    const privateKey = JSON.parse(jsonContent).mnemonic
    const wallet = new TestCosmWasmWallet(
      await Secp256k1HdWallet.fromMnemonic(privateKey)
    )
    const accountData = (await wallet.wallet.getAccounts())[0]
    wallet.addressStr = accountData.address
    wallet.pubkey = accountData.pubkey
    wallet._chainName = chainName
    return wallet
  }

  get chainName(): string {
    if (this._chainName === undefined) {
      throw new Error('Chain name is not set')
    }
    return this._chainName
  }

  public address(): string {
    if (this.addressStr === undefined) {
      throw new Error('Address is not set')
    }
    return this.addressStr
  }

  async signMessage(payload: string): Promise<SignedMessage> {
    /**
     * Only supports sign doc in the format of Amino. (in the case of protobuf, ADR-36 (opens new window)requirements aren't fully specified for implementation)
     * sign doc message should be single and the message type should be "sign/MsgSignData"
     * sign doc "sign/MsgSignData" message should have "signer" and "data" as its value. "data" should be base64 encoded
     * sign doc chain_id should be an empty string("")
     * sign doc memo should be an empty string("")
     * sign doc account_number should be "0"
     * sign doc sequence should be "0"
     * sign doc fee should be {gas: "0", amount: []}
     */
    const {
      signed,
      signature: { pub_key, signature: signatureBase64 },
    } = await this.wallet.signAmino(
      this.address(),
      makeADR36AminoSignDoc(this.address(), payload)
    )

    // const fullMessage = cosmosGetFullMessage(this.address(), payload)
    const fullMessage = serializeSignDoc(signed)
    const signature = Buffer.from(signatureBase64, 'base64')
    const publicKey = getUncompressedPubkey(
      Buffer.from(pub_key.value, 'base64')
    )
    if (this.chainName == 'injective') {
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
  }
}

test('Evm signature', async () => {
  const evmTestWallet = new TestEvmWallet(
    new ethers.Wallet(ethers.Wallet.createRandom().privateKey)
  )
  const payload = 'Test payload'
  const signedMessage = await evmTestWallet.signMessage(payload)
  const signature = secp256k1.Signature.fromCompact(signedMessage.signature)
  const recovered = uncompressedToEvmPubkey(
    signature
      .addRecoveryBit(signedMessage.recoveryId!)
      .recoverPublicKey(Hash.keccak256(signedMessage.fullMessage))
      .toRawBytes(false)
  )
  expect(
    Buffer.from(recovered).equals(
      Buffer.from(removeLeading0x(evmTestWallet.wallet.address), 'hex')
    )
  )

  const solanaKeypair = anchor.web3.Keypair.generate()
  const connection = new anchor.web3.Connection('http://localhost:8899')
  const provider = new anchor.AnchorProvider(
    connection,
    new NodeWallet(solanaKeypair),
    { preflightCommitment: 'processed', commitment: 'processed' }
  )

  const airdropTxn = await connection.requestAirdrop(
    solanaKeypair.publicKey,
    LAMPORTS_PER_SOL
  )
  await connection.confirmTransaction({
    signature: airdropTxn,
    ...(await connection.getLatestBlockhash()),
  })

  let ix = Secp256k1Program.createInstructionWithEthAddress({
    ethAddress: signedMessage.publicKey,
    message: signedMessage.fullMessage,
    signature: signedMessage.signature,
    recoveryId: signedMessage.recoveryId!,
  })

  const txn = new Transaction()
  txn.add(ix)

  await provider.sendAndConfirm(txn, [solanaKeypair])
}, 40000)
