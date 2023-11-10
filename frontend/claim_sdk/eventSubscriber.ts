import * as anchor from '@coral-xyz/anchor'
import tokenDispenser from './idl/token_dispenser.json'
import { BorshCoder, Idl, AnchorProvider, IdlEvents } from '@coral-xyz/anchor'
import { ConfirmedSignatureInfo, TransactionSignature } from '@solana/web3.js'
import { TokenDispenser } from './idl/token_dispenser'

export class TokenDispenserEventSubscriber {
  eventParser: anchor.EventParser
  connection: anchor.web3.Connection
  programId: anchor.web3.PublicKey
  timeWindowSecs: number

  constructor(
    endpoint: string,
    programId: anchor.web3.PublicKey,
    timeWindowSecs: number,
    confirmOpts?: anchor.web3.ConfirmOptions
  ) {
    const coder = new BorshCoder(tokenDispenser as Idl)
    this.programId = programId
    this.eventParser = new anchor.EventParser(this.programId, coder)
    this.timeWindowSecs = timeWindowSecs
    confirmOpts = confirmOpts ?? anchor.AnchorProvider.defaultOptions()
    if (
      !confirmOpts.commitment ||
      !['confirmed', 'finalized'].includes(confirmOpts.commitment)
    ) {
      throw new Error(
        "commitment must be 'confirmed' or 'finalized' for event subscriber"
      )
    }
    this.connection = new anchor.web3.Connection(endpoint, confirmOpts)
  }

  /**
   * Parses transaction logs for the program and returns the events
   * for the transactions that occurred within the time window.
   */
  public async parseTransactionLogs(): Promise<{
    txnEvents: TxnEventInfo[]
    errorLogs: TxnInfo[]
  }> {
    const currentTimeSec = Date.now() / 1000
    let signatures: Array<ConfirmedSignatureInfo> = []
    let currentBatch = await this.connection.getSignaturesForAddress(
      this.programId,
      {},
      this.connection.commitment as anchor.web3.Finality
    )
    let batchWithinWindow = true
    while (currentBatch.length > 0 && batchWithinWindow) {
      const currentBatchLastSig =
        currentBatch[currentBatch.length - 1]?.signature
      const currentBatchLastSigBlockTime = await this.getTransactionBlockTime(
        currentBatchLastSig
      )
      if (
        currentBatchLastSigBlockTime &&
        currentBatchLastSigBlockTime < currentTimeSec - this.timeWindowSecs
      ) {
        batchWithinWindow = false
      }
      signatures = signatures.concat(currentBatch)
      currentBatch = await this.connection.getSignaturesForAddress(
        this.programId,
        {
          before: currentBatchLastSig,
          // Note: ignoring lastSignature and will assume datadog can handle de-duplication
        },
        this.connection.commitment as anchor.web3.Finality
      )
    }

    const validTxns = []
    // TODO: figure out what to do with error txns
    const errorTxns = []
    for (const signature of signatures) {
      if (signature.err) {
        errorTxns.push(signature.signature)
      } else {
        validTxns.push(signature.signature)
      }
    }
    const txns = await this.connection.getTransactions(validTxns, {
      commitment: this.connection.commitment as anchor.web3.Finality,
      maxSupportedTransactionVersion: 0,
    })
    const txnLogs = txns.map((txLog) => {
      return {
        signature: txLog?.transaction.signatures[0] ?? '',
        logs: txLog?.meta?.logMessages ?? [],
        blockTime: txLog?.blockTime ?? 0,
        slot: txLog?.slot ?? 0,
      }
    })

    const txnEvents = txnLogs.map((txnLog) => {
      const eventGen = this.eventParser.parseLogs(txnLog.logs)
      const events = []
      let event = eventGen.next()
      // Note: should only have 1 event/claim per txn at most
      while (!event.done) {
        events.push(
          event.value.data as any as IdlEvents<TokenDispenser>['ClaimEvent']
        )
        event = eventGen.next()
      }

      return {
        signature: txnLog.signature,
        blockTime: txnLog.blockTime,
        slot: txnLog.slot,
        event: events.length > 0 ? events[0] : undefined,
      }
    })

    const errorTxnInfo = await this.connection.getTransactions(errorTxns, {
      commitment: this.connection.commitment as anchor.web3.Finality,
      maxSupportedTransactionVersion: 0,
    })
    const errorLogs: TxnInfo[] = errorTxnInfo.map((txLog) => {
      return {
        signature: txLog?.transaction.signatures[0] ?? '',
        blockTime: txLog?.blockTime ?? 0,
        slot: txLog?.slot ?? 0,
      }
    })

    return {
      txnEvents,
      errorLogs,
    }
  }

  private async getTransactionBlockTime(
    signature: string
  ): Promise<number | null | undefined> {
    const txn = await this.connection.getTransaction(signature, {
      commitment: this.connection.commitment as anchor.web3.Finality,
      maxSupportedTransactionVersion: 0,
    })
    // blockTime in unix timestamp (seconds)
    return txn?.blockTime
  }
}

/**
 * Formats the fields in claimEvent.
 *
 * Note: toNumber() is safe for both claimAmount & remainingBalance
 * javascript number.MAX_SAFE_INTEGER = 9_007_199_254_740_991 (2^53 - 1)
 * total airdrop 200_000_000.
 * normalized with decimals 200_000_000_000_000
 * @param event
 */
export function formatTxnEventInfo(txnEvnInfo: TxnEventInfo) {
  const prefixEcosystems = ['evm', 'sui', 'aptos']
  let formattedEvent: any = {
    signature: txnEvnInfo.signature,
    blockTime: txnEvnInfo.blockTime,
    slot: txnEvnInfo.slot,
  }
  if (txnEvnInfo.event) {
    formattedEvent = {
      ...formattedEvent,
      ...txnEvnInfo.event,
      //TODO: how to format leafBuffer?
      claimant: txnEvnInfo.event.claimant.toBase58(),
      claimAmount: txnEvnInfo.event.claimAmount.toNumber(),
      remainingBalance: txnEvnInfo.event.remainingBalance.toNumber(),
    }
    if (prefixEcosystems.includes(txnEvnInfo.event.ecosystem)) {
      formattedEvent = {
        ...formattedEvent,
        address: '0x' + txnEvnInfo.event.address,
      }
    }
  }
  return formattedEvent
}

export type TxnInfo = {
  signature: string
  blockTime: number
  slot: number
}
export type TxnEventInfo = TxnInfo & {
  event: IdlEvents<TokenDispenser>['ClaimEvent'] | undefined
}
