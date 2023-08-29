import * as anchor from '@coral-xyz/anchor'
import tokenDispenser from './idl/token_dispenser.json'
import type { TokenDispenser } from './idl/token_dispenser'
import { Idl, IdlAccounts, IdlTypes, Program } from '@coral-xyz/anchor'
import { Buffer } from 'buffer'
import { MerkleTree } from './merkleTree'
import {
  Connection,
  Ed25519Program,
  LAMPORTS_PER_SOL,
  PublicKey,
  Secp256k1Program,
  Transaction,
  TransactionSignature,
} from '@solana/web3.js'
import * as splToken from '@solana/spl-token'
import { ClaimInfo, Ecosystem } from './claim'
import { TOKEN_PROGRAM_ID, Token } from '@solana/spl-token'
import { SignedMessage } from './ecosystems/signatures'
import { extractChainId } from './ecosystems/cosmos'
import { blake2b } from '@noble/hashes/blake2b'

type bump = number
// NOTE: This must be kept in sync with the on-chain program
const AUTHORIZATION_PAYLOAD = [
  'Pyth Grant PID:\n',
  '\nI authorize wallet\n',
  '\nto claim my token grant.\n',
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

  public getReceiptPda(claimInfo: ClaimInfo): [anchor.web3.PublicKey, bump] {
    return anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from('receipt'), MerkleTree.hashLeaf(claimInfo.toBuffer())],
      this.programId
    )
  }

  public async isClaimAlreadySubmitted(claimInfo: ClaimInfo): Promise<boolean> {
    return (
      (await this.connection.getAccountInfo(
        this.getReceiptPda(claimInfo)[0]
      )) !== null
    )
  }

  public async initialize(
    root: Buffer,
    mint: anchor.web3.PublicKey,
    treasury: anchor.web3.PublicKey,
    dispenserGuard: anchor.web3.PublicKey
  ): Promise<TransactionSignature> {
    return this.tokenDispenserProgram.methods
      .initialize(Array.from(root), dispenserGuard)
      .accounts({
        config: this.getConfigPda()[0],
        mint,
        treasury,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()
  }

  public generateAuthorizationPayload(): string {
    return AUTHORIZATION_PAYLOAD[0].concat(
      this.programId.toString(),
      AUTHORIZATION_PAYLOAD[1],
      this.claimant.toString(),
      AUTHORIZATION_PAYLOAD[2]
    )
  }

  public async createAssociatedTokenAccountTxnIfNeeded(): Promise<Transaction | null> {
    const config = await this.getConfig()
    const associatedTokenAccount = await this.getClaimantFundAddress()
    if (
      (await this.provider.connection.getAccountInfo(
        associatedTokenAccount
      )) === null
    ) {
      const createAssociatedTokenAccountIx =
        splToken.Token.createAssociatedTokenAccountInstruction(
          splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
          splToken.TOKEN_PROGRAM_ID,
          config.mint,
          associatedTokenAccount,
          this.claimant,
          this.claimant
        )
      const txn = new Transaction()
      txn.add(createAssociatedTokenAccountIx)
      return txn
    }
    return null
  }

  public async submitClaims(
    claims: {
      claimInfo: ClaimInfo
      proofOfInclusion: Uint8Array[]
      signedMessage: SignedMessage | undefined
    }[]
  ): Promise<void> {
    /// This is only eth & cosmwasm for now
    let txs: { tx: Transaction }[] = []

    const createAtaTxn = await this.createAssociatedTokenAccountTxnIfNeeded()
    if (createAtaTxn) {
      txs.push({ tx: createAtaTxn })
    }
    for (const claim of claims) {
      txs.push({
        tx: await this.generateClaimTransaction(
          claim.claimInfo,
          claim.proofOfInclusion,
          claim.signedMessage
        ),
      })
    }
    if (this.tokenDispenserProgram.provider.sendAll) {
      await this.tokenDispenserProgram.provider.sendAll(txs)
    }
  }

  public async generateClaimTransaction(
    claimInfo: ClaimInfo,
    proofOfInclusion: Uint8Array[],
    signedMessage: SignedMessage | undefined
  ): Promise<Transaction> {
    // 1. generate claim certificate
    //    a. create proofOfIdentity
    const proofOfIdentity = this.createProofOfIdentity(claimInfo, signedMessage)

    const claimCert: IdlTypes<TokenDispenser>['ClaimCertificate'] = {
      amount: claimInfo.amount,
      proofOfIdentity,
      proofOfInclusion,
    }

    // 2. generate signature verification instruction if needed
    const signatureVerificationIx =
      this.generateSignatureVerificationInstruction(
        claimInfo.ecosystem,
        signedMessage
      )

    // 3. derive receipt pda
    if (await this.isClaimAlreadySubmitted(claimInfo)) {
      throw new Error('Claim already submitted')
    }
    const receiptPda = this.getReceiptPda(claimInfo)[0]

    // 4. submit claim
    return this.tokenDispenserProgram.methods
      .claim([claimCert])
      .accounts({
        claimant: this.claimant,
        claimantFund: await this.getClaimantFundAddress(),
        config: this.getConfigPda()[0],
        treasury: (await this.getConfig()).treasury,
        tokenProgram: TOKEN_PROGRAM_ID,
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
      .preInstructions(signatureVerificationIx ? [signatureVerificationIx] : [])
      .transaction()
  }

  private createProofOfIdentity(
    claimInfo: ClaimInfo,
    signedMessage: SignedMessage | undefined
  ): IdlTypes<TokenDispenser>['IdentityCertificate'] {
    if (claimInfo.ecosystem === 'solana') {
      return {
        solana: {},
      }
    }

    if (signedMessage) {
      switch (claimInfo.ecosystem) {
        case 'evm':
        case 'aptos':
        case 'sui':
        case 'injective': {
          return {
            [claimInfo.ecosystem]: {
              pubkey: Array.from(signedMessage.publicKey),
              verificationInstructionIndex: 0,
            },
          }
        }
        case 'cosmwasm': {
          return {
            cosmwasm: {
              pubkey: Array.from(signedMessage.publicKey),
              chainId: extractChainId(claimInfo.identity),
              signature: Array.from(signedMessage.signature),
              recoveryId: signedMessage.recoveryId!,
              message: Buffer.from(signedMessage.fullMessage),
            },
          }
        }
        case 'discord': {
          return {
            discord: {
              username: claimInfo.identity,
              verificationInstructionIndex: 0,
            },
          }
        }
        //TODO: implement other ecosystems
        default: {
          throw new Error(`unknown ecosystem type: ${claimInfo.ecosystem}`)
        }
      }
    } else {
      throw new Error(
        'signedMessage must be provided for non-solana ecosystems'
      )
    }
  }

  private generateSignatureVerificationInstruction(
    ecosystem: Ecosystem,
    signedMessage: SignedMessage | undefined
  ): anchor.web3.TransactionInstruction | undefined {
    if (ecosystem === 'solana') {
      return undefined
    }

    if (signedMessage) {
      switch (ecosystem) {
        case 'evm':
        case 'injective': {
          return Secp256k1Program.createInstructionWithEthAddress({
            ethAddress: signedMessage.publicKey,
            message: signedMessage.fullMessage,
            signature: signedMessage.signature,
            recoveryId: signedMessage.recoveryId!,
          })
        }
        case 'cosmwasm': {
          return undefined
        }
        case 'discord':
        case 'sui':
        case 'aptos': {
          return Ed25519Program.createInstructionWithPublicKey({
            publicKey: signedMessage.publicKey,
            message: signedMessage.fullMessage,
            signature: signedMessage.signature,
            instructionIndex: 0,
          })
        }
        default: {
          // TODO: support the other ecosystems
          throw new Error(`unknown ecosystem type: ${ecosystem}`)
        }
      }
    } else {
      throw new Error(
        'signedMessage must be provided for non-solana ecosystems'
      )
    }
  }
  public async getClaimantFundAddress(): Promise<PublicKey> {
    const config = await this.getConfig()
    const associatedTokenAccount =
      await splToken.Token.getAssociatedTokenAddress(
        splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
        splToken.TOKEN_PROGRAM_ID,
        config.mint,
        this.claimant
      )
    return associatedTokenAccount
  }

  public async setupMintAndTreasury(): Promise<{
    mint: Token
    treasury: PublicKey
  }> {
    const mintAuthority = anchor.web3.Keypair.generate()

    await airdrop(this.connection, LAMPORTS_PER_SOL, mintAuthority.publicKey)
    const mint = await Token.createMint(
      this.connection,
      mintAuthority,
      mintAuthority.publicKey,
      null,
      6,
      splToken.TOKEN_PROGRAM_ID
    )

    const treasury = await mint.createAccount(mintAuthority.publicKey)
    await mint.mintTo(treasury, mintAuthority, [], 1000000000)
    await mint.approve(
      treasury,
      this.getConfigPda()[0],
      mintAuthority,
      [],
      1000000000
    )
    return { mint, treasury }
  }
}

export async function airdrop(
  connection: Connection,
  amount: number,
  pubkey: PublicKey
): Promise<void> {
  const airdropTxn = await connection.requestAirdrop(pubkey, amount)
  await connection.confirmTransaction({
    signature: airdropTxn,
    ...(await connection.getLatestBlockhash()),
  })
}
