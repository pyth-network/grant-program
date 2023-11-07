import { ethers } from 'ethers'
import {
  Ed25519Program,
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
import {
  TestAptosWallet,
  TestCosmWasmWallet,
  TestEvmWallet,
  TestSuiWallet,
} from '../testWallets'
import path from 'path'
import { airdrop } from '../solana'
import { ed25519 } from '@noble/curves/ed25519'
import { Ed25519PublicKey } from '@mysten/sui.js/keypairs/ed25519'
import { blake2b } from '@noble/hashes/blake2b'
import { getInjectiveAddress } from '../../utils/getInjectiveAddress'
import { getAddress } from 'ethers'

describe('signature tests', () => {
  const solanaKeypair = anchor.web3.Keypair.generate()
  const connection = new anchor.web3.Connection('http://127.0.0.1:8899')
  const provider = new anchor.AnchorProvider(
    connection,
    new NodeWallet(solanaKeypair),
    { preflightCommitment: 'processed', commitment: 'processed' }
  )

  beforeAll(async () => {
    await airdrop(connection, LAMPORTS_PER_SOL, solanaKeypair.publicKey)
  }, 30000)

  test('Evm signature', async () => {
    const evmTestWallet = new TestEvmWallet(
      new ethers.Wallet(ethers.Wallet.createRandom().privateKey),
      false
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
    const injectiveWallet = TestEvmWallet.fromKeyfile(
      cosmosPrivateKeyPath,
      true
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

    const injectiveAddrFromRecovered = getInjectiveAddress(
      getAddress(Buffer.from(recoveredEvmPubkey).toString('hex'))
    )
    expect(injectiveAddrFromRecovered).toEqual(injectiveWallet.address())

    expect(Buffer.from(recoveredEvmPubkey).equals(Buffer.from(evmPubkey)))

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

  test('Aptos signature', async () => {
    const aptosPrivateKeyPath = path.resolve(
      __dirname,
      '../../integration/keys/aptos_private_key.json'
    )

    const testWallet = TestAptosWallet.fromKeyfile(aptosPrivateKeyPath)
    const payload = 'Test payload'
    const signedMessage = await testWallet.signMessage(payload)

    const verified = ed25519.verify(
      signedMessage.signature,
      signedMessage.fullMessage,
      signedMessage.publicKey
    )
    expect(verified).toBeTruthy()
    let ix = Ed25519Program.createInstructionWithPublicKey({
      publicKey: signedMessage.publicKey,
      message: signedMessage.fullMessage,
      signature: signedMessage.signature,
    })

    const txn = new Transaction()
    txn.add(ix)

    await provider.sendAndConfirm(txn, [solanaKeypair])
  }, 40000)

  test('Sui signature', async () => {
    const suiPrivateKeyPath = path.resolve(
      __dirname,
      '../../integration/keys/sui_private_key.json'
    )
    const testWallet = TestSuiWallet.fromKeyfile(suiPrivateKeyPath)
    const payload = 'Test payload'
    const signedMessage = await testWallet.signMessage(payload)
    const pubkey = new Ed25519PublicKey(signedMessage.publicKey)

    const verified = await pubkey.verify(
      signedMessage.fullMessage,
      signedMessage.signature
    )
    expect(verified).toBeTruthy()
    let ix = Ed25519Program.createInstructionWithPublicKey({
      publicKey: signedMessage.publicKey,
      message: signedMessage.fullMessage,
      signature: signedMessage.signature,
    })

    const txn = new Transaction()
    txn.add(ix)

    await provider.sendAndConfirm(txn, [solanaKeypair])
  })
})
