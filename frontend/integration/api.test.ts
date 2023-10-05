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
import {
  checkAllProgramsWhitelisted,
  checkProgramAppears,
  checkSetComputeBudgetInstructionsAreSetComputeUnitLimit,
  checkTransaction,
  checkTransactions,
  checkV0,
  countTotalSignatures,
} from '../utils/verifyTransaction'

dotenv.config()
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID!)
const WHITELISTED_PROGRAMS: PublicKey[] = [
  PROGRAM_ID,
  Secp256k1Program.programId,
  Ed25519Program.programId,
  ComputeBudgetProgram.programId,
]

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
        funder: funderPubkey,
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

    // API call

    const transactionOK1 = createTestTransactionFromInstructions([
      tokenDispenserInstruction,
    ])

    const transactionOK2 = createTestTransactionFromInstructions([
      tokenDispenserInstruction,
      secp256k1ProgramInstruction,
      computeBudgetSetComputeUnits,
    ])

    const transactionTooManySigs = createTestTransactionFromInstructions([
      tokenDispenserInstruction,
      secp256k1ProgramInstruction,
      ed25519ProgramInstruction,
      computeBudgetSetComputeUnits,
    ])

    const transactionBadTransfer = createTestTransactionFromInstructions([
      systemProgramInstruction,
    ])

    const transactionBadNoTokenDispenser =
      createTestTransactionFromInstructions([
        secp256k1ProgramInstruction,
        ed25519ProgramInstruction,
        computeBudgetSetComputeUnits,
      ])

    const transactionBadComputeHeap = createTestTransactionFromInstructions([
      tokenDispenserInstruction,
      computeBudgetRequestHeapFrame,
    ])

    const transactionBadTransfer2 = createTestTransactionFromInstructions([
      tokenDispenserInstruction,
      systemProgramInstruction,
    ])

    const transactionBadTransfer3 = createTestTransactionFromInstructions([
      systemProgramInstruction,
      tokenDispenserInstruction,
    ])

    const transactionLegacy = new VersionedTransaction(
      new TransactionMessage({
        instructions: [tokenDispenserInstruction],
        payerKey: funderPubkey,
        recentBlockhash: RANDOM_BLOCKHASH,
      }).compileToLegacyMessage()
    )

    await mockfetchFundTransaction([transactionOK1])
    expect(
      checkTransactions([transactionOK1], PROGRAM_ID, WHITELISTED_PROGRAMS)
    ).toBe(true)

    await mockfetchFundTransaction([transactionOK2])
    expect(
      checkTransactions([transactionOK2], PROGRAM_ID, WHITELISTED_PROGRAMS)
    ).toBe(true)

    await expect(
      mockfetchFundTransaction([transactionTooManySigs]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')
    expect(
      checkTransactions(
        [transactionTooManySigs],
        PROGRAM_ID,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)

    await expect(
      mockfetchFundTransaction([transactionBadTransfer]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')
    expect(
      checkTransactions(
        [transactionBadTransfer],
        PROGRAM_ID,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)

    await expect(
      mockfetchFundTransaction([transactionBadNoTokenDispenser]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')
    expect(
      checkTransactions(
        [transactionBadNoTokenDispenser],
        PROGRAM_ID,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)

    await expect(
      mockfetchFundTransaction([transactionBadComputeHeap]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')
    expect(
      checkTransactions(
        [transactionBadComputeHeap],
        PROGRAM_ID,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)

    await expect(
      mockfetchFundTransaction([transactionBadTransfer2]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')
    expect(
      checkTransactions(
        [transactionBadTransfer2],
        PROGRAM_ID,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)

    await expect(
      mockfetchFundTransaction([transactionBadTransfer3]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')
    expect(
      checkTransactions(
        [transactionBadTransfer3],
        PROGRAM_ID,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)

    await expect(
      mockfetchFundTransaction([transactionLegacy]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')
    expect(
      checkTransactions([transactionLegacy], PROGRAM_ID, WHITELISTED_PROGRAMS)
    ).toBe(false)

    // More granular tests
    expect(
      checkTransaction(transactionOK1, PROGRAM_ID, WHITELISTED_PROGRAMS)
    ).toBe(true)
    expect(checkProgramAppears(transactionOK1, PROGRAM_ID)).toBe(true)
    expect(
      checkAllProgramsWhitelisted(transactionOK1, WHITELISTED_PROGRAMS)
    ).toBe(true)
    expect(checkV0(transactionOK1)).toBe(true)
    expect(
      checkSetComputeBudgetInstructionsAreSetComputeUnitLimit(transactionOK1)
    ).toBe(true)
    expect(countTotalSignatures(transactionOK1)).toBe(2)

    expect(
      checkTransaction(transactionOK2, PROGRAM_ID, WHITELISTED_PROGRAMS)
    ).toBe(true)
    expect(checkProgramAppears(transactionOK2, PROGRAM_ID)).toBe(true)
    expect(
      checkAllProgramsWhitelisted(transactionOK2, WHITELISTED_PROGRAMS)
    ).toBe(true)
    expect(checkV0(transactionOK2)).toBe(true)
    expect(
      checkSetComputeBudgetInstructionsAreSetComputeUnitLimit(transactionOK2)
    ).toBe(true)
    expect(countTotalSignatures(transactionOK2)).toBe(3)

    expect(
      checkTransaction(transactionTooManySigs, PROGRAM_ID, WHITELISTED_PROGRAMS)
    ).toBe(false)
    expect(checkProgramAppears(transactionTooManySigs, PROGRAM_ID)).toBe(true)
    expect(
      checkAllProgramsWhitelisted(transactionTooManySigs, WHITELISTED_PROGRAMS)
    ).toBe(true)
    expect(checkV0(transactionTooManySigs)).toBe(true)
    expect(
      checkSetComputeBudgetInstructionsAreSetComputeUnitLimit(
        transactionTooManySigs
      )
    ).toBe(true)
    expect(countTotalSignatures(transactionTooManySigs)).toBe(4)

    expect(
      checkTransaction(transactionBadTransfer, PROGRAM_ID, WHITELISTED_PROGRAMS)
    ).toBe(false)
    expect(checkProgramAppears(transactionBadTransfer, PROGRAM_ID)).toBe(false)
    expect(
      checkAllProgramsWhitelisted(transactionBadTransfer, WHITELISTED_PROGRAMS)
    ).toBe(false)
    expect(checkV0(transactionBadTransfer)).toBe(true)
    expect(
      checkSetComputeBudgetInstructionsAreSetComputeUnitLimit(
        transactionBadTransfer
      )
    ).toBe(true)
    expect(countTotalSignatures(transactionBadTransfer)).toBe(2)

    expect(
      checkTransaction(
        transactionBadNoTokenDispenser,
        PROGRAM_ID,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)
    expect(
      checkProgramAppears(transactionBadNoTokenDispenser, PROGRAM_ID)
    ).toBe(false)
    expect(
      checkAllProgramsWhitelisted(
        transactionBadNoTokenDispenser,
        WHITELISTED_PROGRAMS
      )
    ).toBe(true)
    expect(checkV0(transactionBadNoTokenDispenser)).toBe(true)
    expect(
      checkSetComputeBudgetInstructionsAreSetComputeUnitLimit(
        transactionBadNoTokenDispenser
      )
    ).toBe(true)
    expect(countTotalSignatures(transactionBadNoTokenDispenser)).toBe(3)

    expect(
      checkTransaction(
        transactionBadComputeHeap,
        PROGRAM_ID,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)
    expect(checkProgramAppears(transactionBadComputeHeap, PROGRAM_ID)).toBe(
      true
    )
    expect(
      checkAllProgramsWhitelisted(
        transactionBadComputeHeap,
        WHITELISTED_PROGRAMS
      )
    ).toBe(true)
    expect(checkV0(transactionBadComputeHeap)).toBe(true)
    expect(
      checkSetComputeBudgetInstructionsAreSetComputeUnitLimit(
        transactionBadComputeHeap
      )
    ).toBe(false)
    expect(countTotalSignatures(transactionBadComputeHeap)).toBe(2)

    expect(
      checkTransaction(
        transactionBadTransfer2,
        PROGRAM_ID,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)
    expect(checkProgramAppears(transactionBadTransfer2, PROGRAM_ID)).toBe(true)
    expect(
      checkAllProgramsWhitelisted(transactionBadTransfer2, WHITELISTED_PROGRAMS)
    ).toBe(false)
    expect(checkV0(transactionBadTransfer2)).toBe(true)
    expect(
      checkSetComputeBudgetInstructionsAreSetComputeUnitLimit(
        transactionBadTransfer2
      )
    ).toBe(true)
    expect(countTotalSignatures(transactionBadTransfer2)).toBe(3)

    expect(
      checkTransaction(
        transactionBadTransfer3,
        PROGRAM_ID,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)
    expect(checkProgramAppears(transactionBadTransfer3, PROGRAM_ID)).toBe(true)
    expect(
      checkAllProgramsWhitelisted(transactionBadTransfer3, WHITELISTED_PROGRAMS)
    ).toBe(false)
    expect(checkV0(transactionBadTransfer3)).toBe(true)
    expect(
      checkSetComputeBudgetInstructionsAreSetComputeUnitLimit(
        transactionBadTransfer3
      )
    ).toBe(true)
    expect(countTotalSignatures(transactionBadTransfer3)).toBe(3)

    expect(
      checkTransaction(transactionLegacy, PROGRAM_ID, WHITELISTED_PROGRAMS)
    ).toBe(false)
    expect(checkProgramAppears(transactionLegacy, PROGRAM_ID)).toBe(true)
    expect(
      checkAllProgramsWhitelisted(transactionLegacy, WHITELISTED_PROGRAMS)
    ).toBe(true)
    expect(checkV0(transactionLegacy)).toBe(false)
    expect(
      checkSetComputeBudgetInstructionsAreSetComputeUnitLimit(transactionLegacy)
    ).toBe(true)
    expect(countTotalSignatures(transactionLegacy)).toBe(2)

    // Grouped transactions
    await mockfetchFundTransaction([transactionOK1, transactionOK2])
    expect(
      checkTransactions(
        [transactionOK1, transactionOK2],
        PROGRAM_ID,
        WHITELISTED_PROGRAMS
      )
    ).toBe(true)

    await expect(
      mockfetchFundTransaction([
        transactionOK1,
        transactionBadTransfer3,
        transactionOK2,
      ]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')
    expect(
      checkTransactions(
        [transactionOK1, transactionBadTransfer3, transactionOK2],
        PROGRAM_ID,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)
    await expect(
      mockfetchFundTransaction([
        transactionOK1,
        transactionOK2,
        transactionBadComputeHeap,
      ]).catch((e) => e)
    ).resolves.toThrow('Unauthorized transaction')
    expect(
      checkTransactions(
        [transactionOK1, transactionOK2, transactionBadComputeHeap],
        PROGRAM_ID,
        WHITELISTED_PROGRAMS
      )
    ).toBe(false)
  })

  it('tests counting signatures', async () => {
    const secp256k1ProgramInstruction =
      Secp256k1Program.createInstructionWithPrivateKey({
        privateKey: Buffer.from(
          ethers.Wallet.createRandom().privateKey.slice(2),
          'hex'
        ),
        message: Buffer.from('hello'),
      })

    const secp256k1ProgramInstruction2Sigs =
      Secp256k1Program.createInstructionWithPrivateKey({
        privateKey: Buffer.from(
          ethers.Wallet.createRandom().privateKey.slice(2),
          'hex'
        ),
        message: Buffer.from('hello'),
      })
    secp256k1ProgramInstruction2Sigs.data[0] = 2

    const secp256k1ProgramInstruction3Sigs =
      Secp256k1Program.createInstructionWithPrivateKey({
        privateKey: Buffer.from(
          ethers.Wallet.createRandom().privateKey.slice(2),
          'hex'
        ),
        message: Buffer.from('hello'),
      })
    secp256k1ProgramInstruction3Sigs.data[0] = 3

    expect(
      countTotalSignatures(
        createTestTransactionFromInstructions([
          secp256k1ProgramInstruction,
          secp256k1ProgramInstruction2Sigs,
          secp256k1ProgramInstruction3Sigs,
        ])
      )
    ).toBe(7)
    expect(
      countTotalSignatures(
        createTestTransactionFromInstructions([
          secp256k1ProgramInstruction2Sigs,
          secp256k1ProgramInstruction,
        ])
      )
    ).toBe(4)
  })
})
