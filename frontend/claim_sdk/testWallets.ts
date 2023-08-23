import path from 'path'
import { Ecosystem } from './claim'
import {
  SignedMessage,
  cosmwasmBuildSignedMessage,
  evmBuildSignedMessage,
  aptosBuildSignedMessage,
} from './ecosystems/signatures'
import { ethers } from 'ethers'
import fs from 'fs'
import { AminoSignResponse, Secp256k1HdWallet } from '@cosmjs/amino'
import { makeADR36AminoSignDoc } from '@keplr-wallet/cosmos'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { Keypair, PublicKey } from '@solana/web3.js'
import { EthSecp256k1Wallet } from '@injectivelabs/sdk-ts/dist/cjs/core/accounts/signers/EthSecp256k1Wallet'
import { OfflineAminoSigner } from '@injectivelabs/sdk-ts/dist/cjs/core/accounts/signers/types/amino-signer'
import { hardDriveSignMessage, signDiscordMessage } from './ecosystems/solana'
import { AptosAccount, HexString } from 'aptos'
import { aptosGetFullMessage } from './ecosystems/aptos'

const KEY_DIR = './integration/keys/'
export const TEST_DISCORD_USERNAME =
  process.env.DISCORD_USERNAME ?? 'a_discord_user' // For development add your discord username to .env

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

export async function loadTestWallets(): Promise<
  Record<Ecosystem, TestWallet[]>
> {
  const evmWallet = TestEvmWallet.fromKeyfile(
    path.resolve(KEY_DIR, 'evm_private_key.json')
  )
  const cosmosPrivateKeyPath = path.resolve(KEY_DIR, 'cosmos_private_key.json')
  const aptosPrivateKeyPath = path.resolve(KEY_DIR, 'aptos_private_key.json')
  const dispenserGuardKeyPath = path.resolve(
    KEY_DIR,
    'dispenser_guard_private_key.json'
  )
  const result: Record<Ecosystem, TestWallet[]> = {
    evm: [],
    cosmwasm: [],
    solana: [],
    aptos: [],
    sui: [],
    discord: [],
    injective: [],
  }
  result['evm'] = [evmWallet]

  result['cosmwasm'] = [
    await TestCosmWasmWallet.fromKeyFile(cosmosPrivateKeyPath),
    await TestCosmWasmWallet.fromKeyFile(cosmosPrivateKeyPath, 'osmo'),
    await TestCosmWasmWallet.fromKeyFile(cosmosPrivateKeyPath, 'neutron'),
  ]
  result['aptos'] = [TestAptosWallet.fromKeyfile(aptosPrivateKeyPath)]
  result['injective'] = [
    await TestCosmWasmWallet.fromKeyFile(cosmosPrivateKeyPath, 'inj'),
  ]

  result['discord'] = [
    DiscordTestWallet.fromKeyfile(TEST_DISCORD_USERNAME, dispenserGuardKeyPath),
  ]
  return result
}

export interface TestWallet {
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
  protected constructor(
    readonly wallet: OfflineAminoSigner,
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

    let wallet: OfflineAminoSigner
    if (chainId === 'inj') {
      const privateKey = Buffer.from(JSON.parse(jsonContent).privateKey, 'hex')
      wallet = await EthSecp256k1Wallet.fromKey(privateKey)
    } else {
      const mnemonic = JSON.parse(jsonContent).mnemonic
      wallet = await Secp256k1HdWallet.fromMnemonic(
        mnemonic,
        chainId ? { prefix: chainId } : {}
      )
    }

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
    return this.username
  }
}

export class TestAptosWallet implements TestWallet {
  constructor(readonly wallet: AptosAccount, readonly addressStr: string) {}
  static fromKeyfile(keyFile: string): TestAptosWallet {
    const jsonContent = fs.readFileSync(keyFile, 'utf8')
    const mnemonic = JSON.parse(jsonContent).mnemonic
    const aptosAccount = AptosAccount.fromDerivePath(
      "m/44'/637'/0'/0'/0'",
      mnemonic
    )
    return new TestAptosWallet(aptosAccount, aptosAccount.authKey().noPrefix())
  }
  address(): string {
    return this.addressStr
  }

  async signMessage(payload: string): Promise<SignedMessage> {
    const aptosMsg = Buffer.from(aptosGetFullMessage(payload))
    const signature = this.wallet.signBuffer(aptosMsg)
    return aptosBuildSignedMessage(
      this.wallet.pubKey().noPrefix(),
      signature.hex(),
      payload
    )
  }
}
