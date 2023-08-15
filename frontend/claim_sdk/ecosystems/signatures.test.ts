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

  new NodeWallet(solanaKeypair).signMessage()
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
}, 20000)
