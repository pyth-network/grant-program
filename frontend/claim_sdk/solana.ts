import * as anchor from '@coral-xyz/anchor'
import tokenDispenser from './idl/token_dispenser.json'
import type { TokenDispenser } from './idl/token_dispenser'
import { Idl, IdlAccounts, IdlTypes, Program } from '@coral-xyz/anchor'
import { Buffer } from 'buffer'
import { MerkleTree } from './merkleTree'
import {
  Secp256k1Program,
  Transaction,
  TransactionInstruction,
  TransactionSignature,
} from '@solana/web3.js'
import { ClaimInfo, Ecosystem } from './claim'
import { ethers } from 'ethers'

type bump = number
// NOTE: This must be kept in sync with the on-chain program
const AUTHORIZATION_PAYLOAD = [
  'Pyth Grant Program ID:\n',
  '\nI irrevocably authorize Solana wallet\n',
  '\nto withdraw my token allocation.\n',
]

/**
 * This class wraps the interaction with the TokenDispenser
 * program for a specific claimant. The claimant will be the
 * solana pubkey of the wallet used in the constructor.
 *
 * TODO: add more documentation
 */
export class TokenDispenserProvider {
  tokenDispenserProgram: anchor.Program<TokenDispenser>
  configPda: [anchor.web3.PublicKey, bump]
  config: IdlAccounts<TokenDispenser>['Config'] | undefined
  wallets: Map<Ecosystem, any>

  constructor(
    endpoint: string,
    wallet: anchor.Wallet,
    programId: anchor.web3.PublicKey,
    confirmOpts?: anchor.web3.ConfirmOptions
  ) {
    confirmOpts = confirmOpts ?? anchor.AnchorProvider.defaultOptions()
    const provider = new anchor.AnchorProvider(
      new anchor.web3.Connection(endpoint, confirmOpts.preflightCommitment),
      wallet,
      confirmOpts
    )
    this.tokenDispenserProgram = new Program(
      tokenDispenser as Idl,
      programId,
      provider
    ) as unknown as Program<TokenDispenser>

    this.configPda = this.getConfigPda()
    this.wallets = new Map<Ecosystem, any>()
    this.wallets.set('solana', wallet)
  }

  get programId(): anchor.web3.PublicKey {
    return this.tokenDispenserProgram.programId
  }

  get connection(): anchor.web3.Connection {
    return this.provider.connection
  }

  get claimant(): anchor.web3.PublicKey {
    return this.provider.publicKey!
  }

  get provider(): anchor.Provider {
    return this.tokenDispenserProgram.provider
  }

  public getConfigPda(): [anchor.web3.PublicKey, bump] {
    return (
      this.configPda ??
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        this.programId
      )
    )
  }

  public async getConfig(): Promise<IdlAccounts<TokenDispenser>['Config']> {
    // config is immutable once its been initialized so this is safe.
    if (this.config === undefined) {
      this.config = await this.fetchConfigData()
    }
    return this.config
  }

  private async fetchConfigData(): Promise<
    IdlAccounts<TokenDispenser>['Config']
  > {
    const configAccountInfo = await this.provider.connection.getAccountInfo(
      this.getConfigPda()[0]
    )
    if (configAccountInfo === null) {
      throw new Error('Config account not found')
    }
    return await this.tokenDispenserProgram.coder.accounts.decode(
      'Config',
      configAccountInfo.data
    )
  }

  public getCartPda(): [anchor.web3.PublicKey, bump] {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('cart'), this.claimant.toBuffer()],
      this.programId
    )
  }

  public async getCart(): Promise<
    IdlAccounts<TokenDispenser>['Cart'] | undefined
  > {
    const cartAccountInfo = await this.provider.connection.getAccountInfo(
      this.getCartPda()[0]
    )

    return cartAccountInfo
      ? this.tokenDispenserProgram.coder.accounts.decode(
          'Cart',
          cartAccountInfo!.data
        )
      : undefined
  }

  public getReceiptPda(claimInfo: ClaimInfo): [anchor.web3.PublicKey, bump] {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('receipt'), MerkleTree.hashLeaf(claimInfo.toBuffer())],
      this.programId
    )
  }

  public async isClaimAlreadySubmitted(claimInfo: ClaimInfo) {
    return (
      (await this.connection.getAccountInfo(
        this.getReceiptPda(claimInfo)[0]
      )) !== null
    )
  }

  public async initialize(
    root: number[],
    mint: anchor.web3.PublicKey,
    treasury: anchor.web3.PublicKey,
    dispenserGuard: anchor.web3.PublicKey
  ): Promise<TransactionSignature> {
    return this.tokenDispenserProgram.methods
      .initialize(root, dispenserGuard)
      .accounts({
        config: this.getConfigPda()[0],
        mint,
        treasury,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()
  }

  public connectWallet(ecosystem: Ecosystem, wallet: any): void {
    this.wallets.set(ecosystem, wallet)
  }

  private async createSignatureVerificationIxForEcosystemWallet(
    ecosystem: Ecosystem,
    ecosystemWallet: any
  ): Promise<TransactionInstruction | undefined> {
    switch (ecosystem) {
      case 'evm': {
        return this.createSecp256K1SignatureVerificationIx(ecosystemWallet)
        break
      }
      case 'discord': {
        // TODO:
        break
      }
      case 'solana': {
        // TODO:
        break
      }
      default: {
        throw new Error(`unknown ecosystem type: ${ecosystem}`)
      }
    }
  }

  private async createSecp256K1SignatureVerificationIx(ecosystemWallet: {
    address: string
    signMessage(message: string): Promise<string>
  }): Promise<TransactionInstruction> {
    const authorizationMessage = this.generateAuthorizationMessage()
    const evmSignedMessage = await ecosystemWallet.signMessage(
      authorizationMessage
    )
    const bufferArr = [
      Buffer.from('\x19Ethereum Signed Message:\n', 'utf-8'),
      Buffer.from(authorizationMessage.length.toString(), 'utf-8'),
      Buffer.from(authorizationMessage, 'utf-8'),
    ]
    const actualMessage = Buffer.concat(bufferArr)

    const full_signature_bytes = ethers.getBytes(evmSignedMessage)
    const signature = full_signature_bytes.slice(0, 64)
    const recoveryId = full_signature_bytes[64] - 27
    return Secp256k1Program.createInstructionWithEthAddress({
      ethAddress: ecosystemWallet.address,
      message: actualMessage,
      signature,
      recoveryId,
      //TODO: add support for other instruction indexes
      instructionIndex: 0,
    })
  }

  private generateAuthorizationMessage() {
    const message = AUTHORIZATION_PAYLOAD[0].concat(
      this.programId.toString(),
      AUTHORIZATION_PAYLOAD[1],
      this.claimant.toString(),
      AUTHORIZATION_PAYLOAD[2]
    )

    return message
  }

  /**
   * Note: this function currently only generates the transaction It doesn't submit it
   * because we need to add the `dispenserGuard` signature to the transaction but
   * the `TokenDispenserProvider` won't have access to the `dispenserGuard` private key
   */
  public async generateClaimTxn(
    claimInfo: ClaimInfo,
    proofOfInclusion: Buffer
  ): Promise<Transaction> {
    // from claimInfo and proofOfInclusion,
    // 1. generate identity proof
    const ecosystem = claimInfo.ecosystem
    const ecosystemWallet = this.wallets.get(ecosystem)
    if (ecosystemWallet === undefined) {
      throw new Error(`Wallet for ${ecosystem} not connected`)
    }
    if (ecosystemWallet.address !== claimInfo.identity) {
      throw new Error(`Wallet address for ${ecosystem} does not match identity`)
    }
    const identityProof: IdlTypes<TokenDispenser>['IdentityCertificate'] = {
      [ecosystem]: {
        pubkey: ethers.getBytes(claimInfo.identity),
        verificationInstructionIndex: 0,
      },
    }

    // 2. generate signature verification instruction if needed

    const signatureVerificationIx =
      await this.createSignatureVerificationIxForEcosystemWallet(
        claimInfo.ecosystem,
        ecosystemWallet
      )

    const preIxs =
      signatureVerificationIx === undefined ? [] : [signatureVerificationIx]

    // 2. generate claim certificate
    const claimCert: IdlTypes<TokenDispenser>['ClaimCertificate'] = {
      amount: claimInfo.amount,
      proofOfIdentity: identityProof,
      proofOfInclusion: [proofOfInclusion],
    }

    // 3. derive receipt PDA
    if (await this.isClaimAlreadySubmitted(claimInfo)) {
      throw new Error('Claim already submitted')
    }
    const receiptPda = this.getReceiptPda(claimInfo)[0]

    // 4. derive cart PDA
    const cartPda = this.getCartPda()[0]

    // 4. submit claim
    return this.tokenDispenserProgram.methods
      .claim([claimCert])
      .accounts({
        config: this.getConfigPda()[0],
        claimant: this.claimant,
        dispenserGuard: (await this.getConfig()).dispenserGuard,
        cart: cartPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        sysvarInstruction: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .remainingAccounts([
        {
          pubkey: receiptPda,
          isWritable: true,
          isSigner: false,
        },
      ])
      .preInstructions(preIxs)
      .transaction()
  }
}

export type QueryParams = [Ecosystem, string]
export function toDiscriminant(ecosystem: Ecosystem): number {
  const identityType = tokenDispenser.types
    .find((t) => t.name === 'Identity')
    ?.type.variants?.findIndex((v) => v.name.toLowerCase() === ecosystem)
  if (identityType === undefined || identityType === -1) {
    throw new Error(`Unknown ecosystem: ${ecosystem}`)
  }
  return identityType
}
