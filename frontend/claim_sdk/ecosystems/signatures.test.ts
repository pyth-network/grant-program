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
import { TestCosmWasmWallet, TestEvmWallet } from '../testWallets'
import path from 'path'
import { Address as InjectiveAddress } from '@injectivelabs/sdk-ts'
import { airdrop } from '../solana'

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

  await airdrop(connection, LAMPORTS_PER_SOL, solanaKeypair.publicKey)

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

test('Injective signature', async () => {
  const cosmosPrivateKeyPath = path.resolve(
    __dirname,
    '../../integration/keys/cosmos_private_key.json'
  )
  const injectiveWallet = await TestCosmWasmWallet.fromKeyFile(
    cosmosPrivateKeyPath,
    'inj'
  )
  const payload = 'Test payload'
  const signedMessage = await injectiveWallet.signMessage(payload)
  const evmPubkey = signedMessage.publicKey

  const signature = secp256k1.Signature.fromCompact(signedMessage.signature)

  const recoveredEvmPubkey = uncompressedToEvmPubkey(
    signature
      .addRecoveryBit(signedMessage.recoveryId!)
      .recoverPublicKey(Hash.keccak256(signedMessage.fullMessage))
      .toRawBytes(false)
  )

  const injectiveAddrFromRecovered = InjectiveAddress.fromHex(
    Buffer.from(recoveredEvmPubkey).toString('hex')
  )
  expect(injectiveAddrFromRecovered.toBech32('inj')).toEqual(
    injectiveWallet.address()
  )

  expect(removeLeading0x(injectiveAddrFromRecovered.toHex())).toEqual(
    Buffer.from(recoveredEvmPubkey).toString('hex')
  )

  expect(Buffer.from(recoveredEvmPubkey).equals(Buffer.from(evmPubkey)))
  const solanaKeypair = anchor.web3.Keypair.generate()
  const connection = new anchor.web3.Connection('http://localhost:8899')
  const provider = new anchor.AnchorProvider(
    connection,
    new NodeWallet(solanaKeypair),
    { preflightCommitment: 'processed', commitment: 'processed' }
  )

  await airdrop(connection, LAMPORTS_PER_SOL, solanaKeypair.publicKey)

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
