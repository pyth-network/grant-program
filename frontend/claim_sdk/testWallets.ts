import path from 'path'
import { Ecosystem } from './claim'
import {
  SignedMessage,
  cosmwasmBuildSignedMessage,
  evmBuildSignedMessage,
} from './ecosystems/signatures'
import { ethers } from 'ethers'
import fs from 'fs'
import { Secp256k1HdWallet } from '@cosmjs/amino'
import { makeADR36AminoSignDoc } from '@keplr-wallet/cosmos'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { Keypair } from '@solana/web3.js'

const KEY_DIR = './integration/keys/'

export async function loadAnchorWallet(): Promise<NodeWallet> {
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

  const result: Record<Ecosystem, TestWallet[]> = {
    evm: [],
    cosmwasm: [],
    solana: [],
    aptos: [],
    sui: [],
    discord: [],
  }
  result['evm'] = [evmWallet]
  result['cosmwasm'] = [
    await TestCosmWasmWallet.fromKeyFile(cosmosPrivateKeyPath),
    await TestCosmWasmWallet.fromKeyFile(cosmosPrivateKeyPath, 'osmo'),
    await TestCosmWasmWallet.fromKeyFile(cosmosPrivateKeyPath, 'neutron'),
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
    const privateKey = JSON.parse(jsonContent).mnemonic
    const secpWallet = await Secp256k1HdWallet.fromMnemonic(
      privateKey,
      chainId ? { prefix: chainId } : {}
    )
    const addressStr = (await secpWallet.getAccounts())[0].address
    return new TestCosmWasmWallet(secpWallet, addressStr)
  }

  public address(): string {
    return this.addressStr
  }

  async signMessage(payload: string): Promise<SignedMessage> {
    const {
      signed,
      signature: { pub_key, signature: signatureBase64 },
    } = await this.wallet.signAmino(
      this.address(),
      makeADR36AminoSignDoc(this.address(), payload)
    )

    return cosmwasmBuildSignedMessage(
      pub_key,
      this.address(),
      payload,
      signatureBase64
    )
  }
}
