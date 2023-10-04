import { ComputeBudgetProgram, VersionedTransaction } from '@solana/web3.js'
import { PublicKey } from '@solana/web3.js'

const SET_COMPUTE_UNIT_LIMIT_DISCRIMINANT = 2

function checkAllProgramsWhitelisted(
  transaction: VersionedTransaction,
  whitelist: PublicKey[]
): boolean {
  for (const ix of transaction.message.compiledInstructions) {
    if (
      !whitelist.some((program) =>
        transaction.message.staticAccountKeys[ix.programIdIndex].equals(program)
      )
    ) {
      return false
    }
  }
  return true
}

function checkV0(transaction: VersionedTransaction) {
  return transaction.version === 0
}

function checkSetComputeBudgetInstructionsAreSetComputeUnitLimit(
  transaction: VersionedTransaction
) {
  for (const ix of transaction.message.compiledInstructions) {
    if (
      transaction.message.staticAccountKeys[ix.programIdIndex].equals(
        ComputeBudgetProgram.programId
      )
    ) {
      if (ix.data[0] !== SET_COMPUTE_UNIT_LIMIT_DISCRIMINANT) {
        return false
      }
    }
  }
  return true
}

function checkProgramAppears(
  transaction: VersionedTransaction,
  program: PublicKey
): boolean {
  for (const ix of transaction.message.compiledInstructions) {
    if (
      transaction.message.staticAccountKeys[ix.programIdIndex].equals(program)
    ) {
      return true
    }
  }
  return false
}

function checkTransaction(
  transaction: VersionedTransaction,
  tokenDispenser: PublicKey,
  whitelist: PublicKey[]
): boolean {
  return (
    checkProgramAppears(transaction, tokenDispenser) && // Make sure at least one instruction is for the token dispenser
    checkSetComputeBudgetInstructionsAreSetComputeUnitLimit(transaction) && // Make sure all compute budget instructions are set compute unit limit
    checkAllProgramsWhitelisted(transaction, whitelist) && // Make sure all programs are either signature precompiles, token dispenser, or compute budget
    checkV0(transaction) // Check the transaction is V0
  )
}

export function checkTransactions(
  transactions: VersionedTransaction[],
  tokenDispenser: PublicKey,
  whitelist: PublicKey[]
): boolean {
<<<<<<< HEAD
  return transactions.every((tx) => checkTransaction(tx, tokenDispenser, whitelist))
=======
  return transactions.every((tx) =>
    checkTransaction(tx, tokenDispenser, whitelist)
  )
>>>>>>> 7f12577 (Check again)
}
