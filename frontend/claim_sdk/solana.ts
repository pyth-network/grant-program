import * as anchor from '@coral-xyz/anchor'
import { Wallet } from '@coral-xyz/anchor/dist/cjs/provider'
import tokenDispenser from './idl/token_dispenser.json'
import type { TokenDispenser } from './idl/token_dispenser'
import { Idl, IdlAccounts, IdlTypes, Program } from '@coral-xyz/anchor'
import { Buffer } from 'buffer'
import { MerkleTree } from './merkleTree'
import {
  AddressLookupTableAccount,
  AddressLookupTableProgram,
  Connection,
  Ed25519Program,
  LAMPORTS_PER_SOL,
  PublicKey,
  Secp256k1Program,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  TransactionMessage,
  TransactionSignature,
  VersionedTransaction,
} from '@solana/web3.js'
import * as splToken from '@solana/spl-token'
import { ClaimInfo, Ecosystem } from './claim'
import { TOKEN_PROGRAM_ID, Token } from '@solana/spl-token'
import { SignedMessage } from './ecosystems/signatures'
import { extractChainId } from './ecosystems/cosmos'

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
    wallet: Wallet,
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
    const addressLookupTable = await this.initAddressLookupTable(treasury)

    return this.tokenDispenserProgram.methods
      .initialize(Array.from(root), dispenserGuard)
      .accounts({
        config: this.getConfigPda()[0],
        mint,
        treasury,
        systemProgram: anchor.web3.SystemProgram.programId,
        addressLookupTable,
      })
      .rpc()
  }

  private async initAddressLookupTable(
    treasury: anchor.web3.PublicKey
  ): Promise<anchor.web3.PublicKey> {
    const recentSlot = await this.provider.connection.getSlot()
    const [loookupTableInstruction, lookupTableAddress] =
      AddressLookupTableProgram.createLookupTable({
        authority: this.provider.publicKey!,
        payer: this.provider.publicKey!,
        recentSlot,
      })
    const extendInstruction = AddressLookupTableProgram.extendLookupTable({
      payer: this.provider.publicKey,
      authority: this.provider.publicKey!,
      lookupTable: lookupTableAddress,
      addresses: [
        this.configPda[0],
        treasury,
        TOKEN_PROGRAM_ID,
        SystemProgram.programId,
        SYSVAR_INSTRUCTIONS_PUBKEY,
      ],
    })
    let createLookupTableTx = new VersionedTransaction(
      new TransactionMessage({
        instructions: [loookupTableInstruction, extendInstruction],
        payerKey: this.provider.publicKey!,
        recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
      }).compileToV0Message()
    )
    await this.provider.sendAndConfirm!(createLookupTableTx, [], {
      skipPreflight: true,
    })
    return lookupTableAddress
  }

  private async getLookupTableAccount(): Promise<AddressLookupTableAccount> {
    const lookupTableAddress = (await this.getConfig()).addressLookupTable
    const resp = await this.connection.getAddressLookupTable(lookupTableAddress)
    if (resp.value === null) {
      throw new Error(`No Address Lookup Table found at ${lookupTableAddress}`)
    }
    return resp.value
  }

  public generateAuthorizationPayload(): string {
    return AUTHORIZATION_PAYLOAD[0].concat(
      this.programId.toString(),
      AUTHORIZATION_PAYLOAD[1],
      this.claimant.toString(),
      AUTHORIZATION_PAYLOAD[2]
    )
  }

  public async createAssociatedTokenAccountTxnIfNeeded(): Promise<VersionedTransaction | null> {
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

      const txn = new VersionedTransaction(
        new TransactionMessage({
          instructions: [createAssociatedTokenAccountIx],
          payerKey: this.provider.publicKey!,
          recentBlockhash: (await this.connection.getLatestBlockhash())
            .blockhash,
        }).compileToV0Message()
      )

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
  ): Promise<Promise<string>[]> {
    let txs: VersionedTransaction[] = []

    const createAtaTxn = await this.createAssociatedTokenAccountTxnIfNeeded()
    if (createAtaTxn) {
      txs.push(createAtaTxn)
    }

    for (const claim of claims) {
      txs.push(
        await this.generateClaimTransaction(
          claim.claimInfo,
          claim.proofOfInclusion,
          claim.signedMessage
        )
      )
    }

    let signedTxs: VersionedTransaction[]
    // We have to call signTransaction for backpack
    if (txs.length === 1) {
      signedTxs = [
        await (
          this.tokenDispenserProgram.provider as anchor.AnchorProvider
        ).wallet.signTransaction(txs[0]),
      ]
    } else {
      signedTxs = await (
        this.tokenDispenserProgram.provider as anchor.AnchorProvider
      ).wallet.signAllTransactions(txs)
    }

    // send createAtaTxn first and then others. Others need a TokenAccount before
    // being able to be executed
    if (createAtaTxn !== null) {
      try {
        const signature = await this.connection.sendTransaction(signedTxs[0])

        const latestBlockHash = await this.connection.getLatestBlockhash()
        await this.connection.confirmTransaction(
          {
            signature,
            blockhash: latestBlockHash.blockhash,
            lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
          },
          'confirmed'
        )

        // remove the executed tx
        signedTxs = signedTxs.slice(1)
      } catch (e) {
        console.error(e)
        // TODO: How to handle the error here?
        throw Error('create account tx failed')
      }
    }

    // send the remaining ones
    const sendTxs = signedTxs.map(async (signedTx) => {
      const signature = await this.connection.sendTransaction(signedTx)
      const latestBlockHash = await this.connection.getLatestBlockhash()
      await this.connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockHash.blockhash,
          lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        },
        'confirmed'
      )

      return signature
    })

    return sendTxs
  }

  public async generateClaimTransaction(
    claimInfo: ClaimInfo,
    proofOfInclusion: Uint8Array[],
    signedMessage: SignedMessage | undefined
  ): Promise<VersionedTransaction> {
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

    const lookupTableAccount = await this.getLookupTableAccount()

    const ixs = signatureVerificationIx ? [signatureVerificationIx] : []
    const claim_ix = await this.tokenDispenserProgram.methods
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
      .instruction()
    ixs.push(claim_ix)

    const claimTx = new VersionedTransaction(
      new TransactionMessage({
        instructions: ixs,
        payerKey: this.provider.publicKey!,
        recentBlockhash: (await this.connection.getLatestBlockhash()).blockhash,
      }).compileToV0Message([lookupTableAccount!])
    )

    return claimTx
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
