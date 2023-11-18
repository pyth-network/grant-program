import * as anchor from '@coral-xyz/anchor'
import tokenDispenser from './idl/token_dispenser.json'
import {
  BorshCoder,
  Idl,
  AnchorProvider,
  IdlEvents,
  IdlTypes,
} from '@coral-xyz/anchor'
import { ConfirmedSignatureInfo, TransactionSignature } from '@solana/web3.js'
import { TokenDispenser } from './idl/token_dispenser'

export class TokenDispenserEventSubscriber {
  eventParser: anchor.EventParser
  connection: anchor.web3.Connection
  programId: anchor.web3.PublicKey
  timeWindowSecs: number
  chunkSize: number

  constructor(
    endpoint: string,
    programId: anchor.web3.PublicKey,
    timeWindowSecs: number,
    chunkSize: number,
    confirmOpts?: anchor.web3.ConfirmOptions
  ) {
    const coder = new BorshCoder(tokenDispenser as Idl)
    this.programId = programId
    this.eventParser = new anchor.EventParser(this.programId, coder)
    this.timeWindowSecs = timeWindowSecs
    this.chunkSize = chunkSize
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
    failedTxnInfos: TxnInfo[]
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

    const validTxnSigs = []
    const errorTxnSigs = []
    for (const signature of signatures) {
      if (signature.err) {
        errorTxnSigs.push(signature.signature)
      } else {
        validTxnSigs.push(signature.signature)
      }
    }
    const validTxnSigChunks = chunkArray(validTxnSigs, this.chunkSize)

    const validTxns = (await this.fetchTxns(validTxnSigChunks)).map((txn) => {
      return {
        signature: txn?.transaction.signatures[0] ?? '',
        logs: txn?.meta?.logMessages ?? [],
        blockTime: txn?.blockTime ?? 0,
        slot: txn?.slot ?? 0,
      }
    })

    const txnEvents = validTxns
      .map((txnLog) => {
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
      .filter(
        (txnEventInfo) =>
          txnEventInfo.blockTime >= currentTimeSec - this.timeWindowSecs
      )

    const failedTxnSigChunks = chunkArray(errorTxnSigs, this.chunkSize)

    const failedTxnInfos = (await this.fetchTxns(failedTxnSigChunks))
      .map((txn) => {
        return {
          signature: txn?.transaction.signatures[0] ?? '',
          blockTime: txn?.blockTime ?? 0,
          slot: txn?.slot ?? 0,
        }
      })
      .filter(
        (txnEventInfo) =>
          txnEventInfo.blockTime >= currentTimeSec - this.timeWindowSecs
      )

    return {
      txnEvents,
      failedTxnInfos,
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

  /**
   * This fetches all the txns by sending each chunk asynchronously as fast as possible.
   * Assumes that RPC node we're using will not rate-limit.
   * @param txnSigChunks
   * @private
   */
  private async fetchTxns(txnSigChunks: any[][]) {
    let txns: anchor.web3.VersionedTransactionResponse[] = []
    await Promise.all(
      txnSigChunks.map(async (txnSigChunk) => {
        const txnsChunk = await this.connection.getTransactions(txnSigChunk, {
          commitment: this.connection.commitment as anchor.web3.Finality,
          maxSupportedTransactionVersion: 0,
        })
        txnsChunk.forEach((txLog) => {
          if (txLog !== null) {
            txns.push(txLog)
          }
        })
      })
    )
    return txns
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
export function formatTxnEventInfo(
  txnEvnInfo: TxnEventInfo
): FormattedTxnEventInfo {
  let formattedEvent: any = {
    signature: txnEvnInfo.signature,
    blockTime: txnEvnInfo.blockTime,
    slot: txnEvnInfo.slot,
  }
  if (txnEvnInfo.event) {
    formattedEvent = {
      ...formattedEvent,
      claimant: txnEvnInfo.event.claimant.toBase58(),
      remainingBalance: txnEvnInfo.event.remainingBalance.toString(),
      claimInfo: formatClaimInfo(txnEvnInfo.event.claimInfo),
    }
  }
  return formattedEvent
}

export type FormattedTxnEventInfo = {
  signature: string
  blockTime: number
  slot: number
  claimant?: string
  remainingBalance?: string
  claimInfo?: FormattedClaimInfo
}

function formatClaimInfo(
  claimInfo: IdlTypes<TokenDispenser>['ClaimInfo']
): FormattedClaimInfo {
  if (claimInfo.identity.discord) {
    return {
      ecosystem: 'discord',
      address: claimInfo.identity.discord.username,
      amount: claimInfo.amount.toString(),
    }
  } else if (claimInfo.identity.solana) {
    return {
      ecosystem: 'solana',
      address: new anchor.web3.PublicKey(
        claimInfo.identity.solana.pubkey
      ).toBase58(),
      amount: claimInfo.amount.toString(),
    }
  } else if (claimInfo.identity.evm) {
    return {
      ecosystem: 'evm',
      address:
        '0x' + Buffer.from(claimInfo.identity.evm.pubkey).toString('hex'),
      amount: claimInfo.amount.toString(),
    }
  } else if (claimInfo.identity.aptos) {
    return {
      ecosystem: 'aptos',
      address:
        '0x' + Buffer.from(claimInfo.identity.aptos.address).toString('hex'),
      amount: claimInfo.amount.toString(),
    }
  } else if (claimInfo.identity.sui) {
    return {
      ecosystem: 'sui',
      address:
        '0x' + Buffer.from(claimInfo.identity.sui.address).toString('hex'),
      amount: claimInfo.amount.toString(),
    }
  } else if (claimInfo.identity.cosmwasm) {
    return {
      ecosystem: 'cosmwasm',
      address: claimInfo.identity.cosmwasm.address,
      amount: claimInfo.amount.toString(),
    }
  } else if (claimInfo.identity.injective) {
    return {
      ecosystem: 'injective',
      address: claimInfo.identity.injective.address,
      amount: claimInfo.amount.toString(),
    }
  } else
    throw new Error(
      `unknown identity type. ${JSON.stringify(claimInfo.identity)}}`
    )
}

export type FormattedClaimInfo = {
  ecosystem: string
  address: string
  amount: string
}

function chunkArray(array: any[], chunkSize: number) {
  return Array.from({ length: Math.ceil(array.length / chunkSize) }, (_, i) =>
    array.slice(i * chunkSize, i * chunkSize + chunkSize)
  )
}

export type TxnInfo = {
  signature: string
  blockTime: number
  slot: number
}
export type TxnEventInfo = TxnInfo & {
  event: IdlEvents<TokenDispenser>['ClaimEvent'] | undefined
}
