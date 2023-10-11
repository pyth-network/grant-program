import * as anchor from '@coral-xyz/anchor'
import tokenDispenser from './idl/token_dispenser.json'
import { BorshCoder, Idl, AnchorProvider, IdlEvents } from '@coral-xyz/anchor'
import { ConfirmedSignatureInfo, TransactionSignature } from '@solana/web3.js'
import { IdlEvent } from '@coral-xyz/anchor/dist/cjs/idl'
import { TokenDispenser } from './idl/token_dispenser'

export class TokenDispenserEventSubscriber {
  eventParser: anchor.EventParser
  connection: anchor.web3.Connection
  programId: anchor.web3.PublicKey
  lastSignature: TransactionSignature | undefined

  constructor(
    endpoint: string,
    programId: anchor.web3.PublicKey,
    confirmOpts?: anchor.web3.ConfirmOptions
  ) {
    const coder = new BorshCoder(tokenDispenser as Idl)
    this.programId = programId
    this.eventParser = new anchor.EventParser(this.programId, coder)
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

  public async parseTransactionLogs(): Promise<
    {
      signature: string
      events: IdlEvents<TokenDispenser>['ClaimEvent'][]
    }[]
  > {
    let signatures: Array<ConfirmedSignatureInfo> = []
    let beforeSig: TransactionSignature | undefined = undefined
    let currentBatch = await this.connection.getSignaturesForAddress(
      this.programId,
      {
        before: beforeSig,
        until: this.lastSignature,
      },
      this.connection.commitment as anchor.web3.Finality
      // 'confirmed'
    )
    while (currentBatch.length > 0) {
      beforeSig = currentBatch[currentBatch.length - 1]?.signature
      signatures = signatures.concat(currentBatch)
      currentBatch = await this.connection.getSignaturesForAddress(
        this.programId,
        {
          before: beforeSig,
          until: this.lastSignature,
        },
        this.connection.commitment as anchor.web3.Finality
      )
    }
    this.lastSignature = signatures[signatures.length - 1]?.signature

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
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    })
    const txnLogs = txns.map((txLog) => {
      return {
        signature: txLog?.transaction.signatures[0] ?? '',
        logs: txLog?.meta?.logMessages ?? [],
      }
    })

    const txnEvents = txnLogs.map((txnLog) => {
      const eventGen = this.eventParser.parseLogs(txnLog.logs)
      const events = []
      let event = eventGen.next()
      while (!event.done) {
        events.push(
          event.value.data as any as IdlEvents<TokenDispenser>['ClaimEvent']
        )
        event = eventGen.next()
      }
      return {
        signature: txnLog.signature,
        events,
      }
    })

    return txnEvents
  }
}
