import { ethers } from 'ethers'
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
import { TestEvmWallet } from '../testWallets'

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
  console.log('ENDPOINT', process.env.ENDPOINT!)
  const connection = new anchor.web3.Connection(process.env.ENDPOINT!)
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
