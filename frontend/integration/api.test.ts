import { AnchorProvider, Program } from '@coral-xyz/anchor'
import IDL from '../claim_sdk/idl/token_dispenser.json'
import {
  ComputeBudgetProgram,
  Connection,
  Ed25519Program,
  Keypair,
  PublicKey,
  Secp256k1Program,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'
import dotenv from 'dotenv'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { ethers } from 'ethers'
import { loadFunderWallet } from '../claim_sdk/testWallets'
import { mockfetchFundTransaction } from './api'

dotenv.config()
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID!)
const RANDOM_BLOCKHASH = 'HXq5QPm883r7834LWwDpcmEM8G8uQ9Hqm1xakCHGxprV'
const funderPubkey = loadFunderWallet().publicKey

function createTestTransactionFromInstructions(
  instructions: TransactionInstruction[]
) {
  return new VersionedTransaction(
    new TransactionMessage({
      instructions,
      payerKey: funderPubkey,
      recentBlockhash: RANDOM_BLOCKHASH,
    }).compileToV0Message()
  )
}

describe('test fund transaction api', () => {
  it('tests the api', async () => {
    const tokenDispenser = new Program(
      IDL as any,
      PROGRAM_ID,
      new AnchorProvider(
        new Connection('http://localhost:8899'),
        new NodeWallet(new Keypair()),
        AnchorProvider.defaultOptions()
      )
    )

    const tokenDispenserInstruction = await tokenDispenser.methods
      .claim([])
      .accounts({
        funder: PublicKey.unique(),
        claimant: PublicKey.unique(),
        claimantFund: PublicKey.unique(),
        config: PublicKey.unique(),
        mint: PublicKey.unique(),
        treasury: PublicKey.unique(),
        tokenProgram: PublicKey.unique(),
        systemProgram: PublicKey.unique(),
        sysvarInstruction: PublicKey.unique(),
        associatedTokenProgram: PublicKey.unique(),
      })
      .instruction()

    const secp256k1ProgramInstruction =
      Secp256k1Program.createInstructionWithPrivateKey({
        privateKey: Buffer.from(
          ethers.Wallet.createRandom().privateKey.slice(2),
          'hex'
        ),
        message: Buffer.from('hello'),
      })
    const ed25519ProgramInstruction =
      Ed25519Program.createInstructionWithPrivateKey({
        privateKey: new Keypair().secretKey,
        message: Buffer.from('hello'),
      })
    const computeBudgetRequestHeapFrame = ComputeBudgetProgram.requestHeapFrame(
      { bytes: 1000 }
    )
    const computeBudgetSetComputeUnits =
      ComputeBudgetProgram.setComputeUnitLimit({ units: 1000 })
    const systemProgramInstruction = SystemProgram.transfer({
      fromPubkey: PublicKey.unique(),
      toPubkey: PublicKey.unique(),
      lamports: 1000,
    })

    const transactionOK1 = createTestTransactionFromInstructions([
      tokenDispenserInstruction,
    ])
    await mockfetchFundTransaction([transactionOK1])

    const transactionOK2 = createTestTransactionFromInstructions([
      tokenDispenserInstruction,
      secp256k1ProgramInstruction,
      ed25519ProgramInstruction,
      computeBudgetSetComputeUnits,
    ])
    await mockfetchFundTransaction([transactionOK2])

    const transactionBadTransfer = createTestTransactionFromInstructions([
      systemProgramInstruction,
    ])
    await expect(
      mockfetchFundTransaction([transactionBadTransfer]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')

    const transactionBadNoTokenDispenser =
      createTestTransactionFromInstructions([
        secp256k1ProgramInstruction,
        ed25519ProgramInstruction,
        computeBudgetSetComputeUnits,
      ])
    await expect(
      mockfetchFundTransaction([transactionBadNoTokenDispenser]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')

    const transactionBadComputeHeap = createTestTransactionFromInstructions([
      tokenDispenserInstruction,
      computeBudgetRequestHeapFrame,
    ])
    await expect(
      mockfetchFundTransaction([transactionBadComputeHeap]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')

    const transactionBadTransfer2 = createTestTransactionFromInstructions([
      tokenDispenserInstruction,
      systemProgramInstruction,
    ])
    await expect(
      mockfetchFundTransaction([transactionBadTransfer2]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')

    const transactionBadTransfer3 = createTestTransactionFromInstructions([
      systemProgramInstruction,
      tokenDispenserInstruction,
    ])
    await expect(
      mockfetchFundTransaction([transactionBadTransfer3]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')

    // Grouped transactions
    await mockfetchFundTransaction([transactionOK1, transactionOK2])

    await expect(
      mockfetchFundTransaction([
        transactionOK1,
        transactionBadTransfer3,
        transactionOK2,
      ]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')
    await expect(
      mockfetchFundTransaction([
        transactionOK1,
        transactionOK2,
        transactionBadComputeHeap,
      ]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')
  })
})
