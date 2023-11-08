import path from 'path'
import dotenv from 'dotenv'
import { Ecosystem } from './claim'
import {
  SignedMessage,
  cosmwasmBuildSignedMessage,
  evmBuildSignedMessage,
  aptosBuildSignedMessage,
  suiBuildSignedMessage,
} from './ecosystems/signatures'
import { ethers } from 'ethers'
import fs from 'fs'
import { AminoSignResponse, Secp256k1HdWallet } from '@cosmjs/amino'
import { makeADR36AminoSignDoc } from '@keplr-wallet/cosmos'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { Keypair, PublicKey } from '@solana/web3.js'
import { hardDriveSignMessage, signDiscordMessage } from './ecosystems/solana'
import { AptosAccount } from 'aptos'
import { aptosGetFullMessage } from './ecosystems/aptos'
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519'
import { hashDiscordUserId } from '../utils/hashDiscord'
import { getInjectiveAddress } from '../utils/getInjectiveAddress'

dotenv.config() // Load environment variables from .env file

const KEY_DIR = './integration/keys/'
export const TEST_DISCORD_USERNAME =
  process.env.DISCORD_USER_ID ?? 'a_discord_user' // For development add your discord username to .env

export const DISCORD_HASH_SALT: Buffer = process.env.DISCORD_HASH_SALT
  ? Buffer.from(new Uint8Array(JSON.parse(process.env.DISCORD_HASH_SALT)))
  : Buffer.alloc(64)

export function loadAnchorWallet(): NodeWallet {
  const keypair = Keypair.fromSecretKey(
    new Uint8Array(
      JSON.parse(
        fs.readFileSync(
          path.resolve(KEY_DIR, 'solana_private_key.json'),
          'utf-8'
        )
      )
    )
  )
  return new NodeWallet(keypair)
}

export function loadFunderWallet(): NodeWallet {
  const keypair = Keypair.fromSecretKey(
    new Uint8Array(
      JSON.parse(
        fs.readFileSync(
          path.resolve(KEY_DIR, 'funder_private_key.json'),
          'utf-8'
        )
      )
    )
  )
  return new NodeWallet(keypair)
}

export async function loadTestWallets(): Promise<
  Record<Ecosystem, TestWallet[]>
> {
  const evmPrivateKeyPath = path.resolve(KEY_DIR, 'evm_private_key.json')
  const cosmosPrivateKeyPath = path.resolve(KEY_DIR, 'cosmos_private_key.json')
  const aptosPrivateKeyPath = path.resolve(KEY_DIR, 'aptos_private_key.json')
  const suiPrivateKeyPath = path.resolve(KEY_DIR, 'sui_private_key.json')

  const dispenserGuardKeyPath = path.resolve(
    KEY_DIR,
    'dispenser_guard_private_key.json'
  )
  const solanaPrivateKeyPath = path.resolve(KEY_DIR, 'solana_private_key.json')

  const result: Record<Ecosystem, TestWallet[]> = {
    discord: [],
    solana: [],
    evm: [],
    sui: [],
    aptos: [],
    cosmwasm: [],
    injective: [],
  }
  result['discord'] = [
    DiscordTestWallet.fromKeyfile(TEST_DISCORD_USERNAME, dispenserGuardKeyPath),
  ]
  result['solana'] = [TestSolanaWallet.fromKeyfile(solanaPrivateKeyPath)]
  result['evm'] = [TestEvmWallet.fromKeyfile(evmPrivateKeyPath)]
  result['sui'] = [TestSuiWallet.fromKeyfile(suiPrivateKeyPath)]
  result['aptos'] = [TestAptosWallet.fromKeyfile(aptosPrivateKeyPath)]
  result['cosmwasm'] = [
    await TestCosmWasmWallet.fromKeyFile(cosmosPrivateKeyPath, 'sei'),
    await TestCosmWasmWallet.fromKeyFile(cosmosPrivateKeyPath, 'osmo'),
    await TestCosmWasmWallet.fromKeyFile(cosmosPrivateKeyPath, 'neutron'),
  ]
  result['injective'] = [TestEvmWallet.fromKeyfile(cosmosPrivateKeyPath, true)]

  return result
}

export interface TestWallet {
  signMessage(payload: string): Promise<SignedMessage>
  address(): string
}

export class TestEvmWallet implements TestWallet {
  constructor(
    readonly wallet: ethers.Wallet,
    readonly isInjectiveWallet: boolean
  ) {}
  static fromKeyfile(
    keyFile: string,
    isInjectiveWallet = false
  ): TestEvmWallet {
    const jsonContent = fs.readFileSync(keyFile, 'utf8')
    const privateKey = JSON.parse(jsonContent).privateKey
    return new TestEvmWallet(new ethers.Wallet(privateKey), isInjectiveWallet)
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
    if (this.isInjectiveWallet) {
      return getInjectiveAddress(this.wallet.address)
    } else {
      return this.wallet.address.toLowerCase()
    }
  }
}

export class TestCosmWasmWallet implements TestWallet {
  protected constructor(
    readonly wallet: Secp256k1HdWallet,
    readonly addressStr: string
  ) {}
  /**
   * Create a wallet from a keyfile. If no chainId is provided,
   * defaults to 'cosmos'
   * @param keyFile
   * @param chainId optional chainId/prefix for the address string
   */
  static async fromKeyFile(
    keyFile: string,
    chainId?: string
  ): Promise<TestCosmWasmWallet> {
    const jsonContent = fs.readFileSync(keyFile, 'utf8')

    const mnemonic = JSON.parse(jsonContent).mnemonic
    const wallet: Secp256k1HdWallet = await Secp256k1HdWallet.fromMnemonic(
      mnemonic,
      chainId ? { prefix: chainId } : {}
    )

    const { address: addressStr } = (await wallet.getAccounts())[0]
    return new TestCosmWasmWallet(wallet, addressStr)
  }

  public address(): string {
    return this.addressStr
  }

  async signMessage(payload: string): Promise<SignedMessage> {
    const {
      signed,
      signature: { pub_key, signature: signatureBase64 },
    } = await this.signAmino(payload)

    return cosmwasmBuildSignedMessage(
      pub_key,
      this.address(),
      payload,
      signatureBase64
    )
  }

  private async signAmino(payload: string): Promise<AminoSignResponse> {
    return this.wallet.signAmino(
      this.address(),
      makeADR36AminoSignDoc(this.address(), payload)
    )
  }
}

export class DiscordTestWallet implements TestWallet {
  // Hack : The wallet here is the dispenser guard instead of the user's wallet
  constructor(readonly username: string, readonly wallet: Keypair) {}

  static fromKeyfile(username: string, keyFile: string): DiscordTestWallet {
    const keypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(keyFile, 'utf-8')))
    )
    return new DiscordTestWallet(username, keypair)
  }
  async signMessage(payload: string): Promise<SignedMessage> {
    return hardDriveSignMessage(Buffer.from(payload, 'utf-8'), this.wallet)
  }
  async signDiscordMessage(
    username: string,
    claimant: PublicKey
  ): Promise<SignedMessage> {
    return signDiscordMessage(username, claimant, this.wallet)
  }

  get dispenserGuardPublicKey(): PublicKey {
    return this.wallet.publicKey
  }

  public address(): string {
    return hashDiscordUserId(DISCORD_HASH_SALT, this.username)
  }
}

export class TestSolanaWallet implements TestWallet {
  constructor(readonly wallet: Keypair) {}
  static fromKeyfile(keyFile: string): TestSolanaWallet {
    const keypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(keyFile, 'utf-8')))
    )
    return new TestSolanaWallet(keypair)
  }

  async signMessage(payload: string): Promise<SignedMessage> {
    return hardDriveSignMessage(Buffer.from(payload, 'utf-8'), this.wallet)
  }

  public address(): string {
    return this.wallet.publicKey.toBase58()
  }
}

export class TestAptosWallet implements TestWallet {
  constructor(readonly wallet: AptosAccount) {}
  static fromKeyfile(keyFile: string): TestAptosWallet {
    const jsonContent = fs.readFileSync(keyFile, 'utf8')
    const mnemonic = JSON.parse(jsonContent).mnemonic
    const aptosAccount = AptosAccount.fromDerivePath(
      "m/44'/637'/0'/0'/0'",
      mnemonic
    )
    return new TestAptosWallet(aptosAccount)
  }
  address(): string {
    return this.wallet.authKey().hex()
  }

  async signMessage(payload: string): Promise<SignedMessage> {
    const aptosMsgBuffer = Buffer.from(aptosGetFullMessage(payload))
    const signature = this.wallet.signBuffer(aptosMsgBuffer)
    return aptosBuildSignedMessage(
      this.wallet.pubKey().hex(),
      signature.hex(),
      payload
    )
  }
}

export class TestSuiWallet implements TestWallet {
  constructor(readonly wallet: Ed25519Keypair) {}

  static fromKeyfile(keyFile: string): TestSuiWallet {
    const jsonContent = fs.readFileSync(keyFile, 'utf8')
    const mnemonic = JSON.parse(jsonContent).mnemonic
    return new TestSuiWallet(Ed25519Keypair.deriveKeypair(mnemonic))
  }

  address(): string {
    return this.wallet.toSuiAddress()
  }
  async signMessage(payload: string): Promise<SignedMessage> {
    const response = (
      await this.wallet.signPersonalMessage(Buffer.from(payload))
    ).signature

    return suiBuildSignedMessage(response, payload)
  }
}
