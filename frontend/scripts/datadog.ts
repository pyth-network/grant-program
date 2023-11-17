/**
 * Post an event returns "OK" response
 *
 * To Run:
 * DD_SITE="datadoghq.com" DD_API_KEY="<DD_API_KEY>" ts-node ./scripts/datadog.ts
 */

import { client, v1 } from '@datadog/datadog-api-client'
import {
  formatTxnEventInfo,
  TokenDispenserEventSubscriber,
  FormattedTxnEventInfo,
  TxnInfo,
} from '../claim_sdk/eventSubscriber'
import * as anchor from '@coral-xyz/anchor'
import {
  INFO,
  WARNING,
  ERROR,
} from '@datadog/datadog-api-client/dist/packages/datadog-api-client-v1/models/EventAlertType'
import { envOrErr } from '../claim_sdk'
import { BN } from '@coral-xyz/anchor'

const ENDPOINT = envOrErr('ENDPOINT')
const PROGRAM_ID = envOrErr('PROGRAM_ID')
const CLUSTER = envOrErr('CLUSTER')
const TIME_WINDOW_SECS = Number.parseInt(envOrErr('TIME_WINDOW_SECS'), 10)
const CHUNK_SIZE = Number.parseInt(envOrErr('CHUNK_SIZE'), 10)
const LOW_BALANCE_THRESHOLD = envOrErr('LOW_BALANCE_THRESHOLD')
// based off airdrop allocation commit 16d0c19f3951427f04cc015d38805f356fcb88b1
const MAX_AMOUNT_PER_ECOSYSTEM = new Map<string, BN>([
  ['discord', new BN('87000000000')],
  ['solana', new BN('19175000000')],
  ['evm', new BN('18371000000')],
  ['sui', new BN('4049000000')],
  ['aptos', new BN('4049000000')],
  ['cosmwasm', new BN('4049000000')],
  ['injective', new BN('4049000000')],
])

async function main() {
  const tokenDispenserEventSubscriber = new TokenDispenserEventSubscriber(
    ENDPOINT,
    new anchor.web3.PublicKey(PROGRAM_ID),
    TIME_WINDOW_SECS,
    CHUNK_SIZE,
    {
      commitment: 'confirmed',
    }
  )

  const configuration = client.createConfiguration()
  const apiInstance = new v1.EventsApi(configuration)

  const { txnEvents, failedTxnInfos } =
    await tokenDispenserEventSubscriber.parseTransactionLogs()

  const formattedTxnEvents = txnEvents
    .filter((txnEvent) => txnEvent.event)
    .map((txnEvent) => formatTxnEventInfo(txnEvent))

  const doubleClaimEventRequests =
    createDoubleClaimEventRequest(formattedTxnEvents)
  if (doubleClaimEventRequests.length > 0) {
    await Promise.all(
      doubleClaimEventRequests.map((doubleClaimEventRequest) => {
        apiInstance
          .createEvent(doubleClaimEventRequest)
          .then((data: v1.EventCreateResponse) => {
            console.log(
              'API called successfully for double claim event. Returned data: ' +
                JSON.stringify(data)
            )
          })
          .catch((error: any) => console.error(error))
      })
    )
  }

  const lowBalanceEventRequest =
    createLowBalanceEventRequest(formattedTxnEvents)
  if (lowBalanceEventRequest) {
    await apiInstance
      .createEvent(lowBalanceEventRequest)
      .then((data: v1.EventCreateResponse) => {
        console.log(
          'API called successfully for low balance threshold event. Returned data: ' +
            JSON.stringify(data)
        )
      })
      .catch((error: any) => console.error(error))
  }

  const txnEventRequests = createTxnEventRequest(formattedTxnEvents)
  await Promise.all(
    txnEventRequests.map((txnEventRequest) => {
      apiInstance
        .createEvent(txnEventRequest)
        .then((data: v1.EventCreateResponse) => {
          console.log(
            'API called successfully for claim event. Returned data: ' +
              JSON.stringify(data)
          )
        })
        .catch((error: any) => console.error(error))
    })
  )

  const failedTxnEventRequests = createFailedTxnEventRequest(failedTxnInfos)
  await Promise.all(
    failedTxnEventRequests.map((errorLogRequest) => {
      apiInstance
        .createEvent(errorLogRequest)
        .then((data: v1.EventCreateResponse) => {
          console.log(
            'API called successfully for failed txn event. Returned data: ' +
              JSON.stringify(data)
          )
        })
        .catch((error: any) => console.error(error))
    })
  )
}

function createTxnEventRequest(
  formattedTxnEvents: FormattedTxnEventInfo[]
): v1.EventsApiCreateEventRequest[] {
  return formattedTxnEvents.map((formattedEvent) => {
    const { signature, claimant } = formattedEvent

    const { ecosystem, address, amount } = formattedEvent.claimInfo!
    if (MAX_AMOUNT_PER_ECOSYSTEM.get(ecosystem)!.lt(new BN(amount))) {
      return {
        body: {
          aggregationKey: `MAX-TRANSFER-EXCEEDED-${signature}`,
          title: `MAX-TRANSFER-FOR-${ecosystem}-EXCEEDED-${claimant}-${address}`,
          text: JSON.stringify(formattedEvent),
          alertType: ERROR,
          tags: [
            `claimant:${claimant}`,
            `ecosystem:${ecosystem}`,
            `network:${CLUSTER}`,
            `error-type:MAX-TRANSFER-EXCEEDED`,
            `service:token-dispenser-event-subscriber`,
          ],
        },
      }
    } else {
      return {
        body: {
          aggregationKey: `${signature}`,
          title: `${claimant}-${ecosystem}-${address}`,
          text: JSON.stringify(formattedEvent),
          alertType: INFO,
          tags: [
            `claimant:${claimant}`,
            `ecosystem:${ecosystem}`,
            `network:${CLUSTER}`,
            `service:token-dispenser-event-subscriber`,
          ],
        },
      }
    }
  })
}

/**
 * Check for double claims and create error events for any detected
 * @param formattedTxnEvents
 */
function createDoubleClaimEventRequest(
  formattedTxnEvents: FormattedTxnEventInfo[]
): v1.EventsApiCreateEventRequest[] {
  const claimInfoMap = new Map<string, Set<FormattedTxnEventInfo>>()
  formattedTxnEvents.forEach((formattedTxnEvent) => {
    const claimInfoKey = `${formattedTxnEvent.claimInfo!.ecosystem}-${
      formattedTxnEvent.claimInfo!.address
    }`

    if (!claimInfoMap.get(claimInfoKey)) {
      claimInfoMap.set(claimInfoKey, new Set<FormattedTxnEventInfo>())
    }
    claimInfoMap.get(claimInfoKey)!.add(formattedTxnEvent)
  })
  const entryGen = claimInfoMap.entries()
  let entry = entryGen.next()
  const doubleClaimEntries: Array<[string, Set<FormattedTxnEventInfo>]> = []
  while (!entry.done) {
    if (entry.value[1].size > 1) {
      doubleClaimEntries.push(entry.value)
    }
    entry = entryGen.next()
  }

  return doubleClaimEntries.map(([claimInfoKey, txnEventInfosSet]) => {
    const [ecosystem, address] = claimInfoKey.split('-')
    const txnEventInfos = Array.from(txnEventInfosSet.values())
    return {
      body: {
        aggregationKey: `DOUBLE-CLAIM-${ecosystem}-${address}`,
        title: `DOUBLE-CLAIM-${ecosystem}-${address}`,
        text: `
              Double Claim detected for ${ecosystem} ${address}
              claim events: ${JSON.stringify(txnEventInfos)}
            `,
        alertType: ERROR,
        tags: [
          `ecosystem:${ecosystem}`,
          `network:${CLUSTER}`,
          `error-type:DOUBLE-CLAIM`,
          `service:token-dispenser-event-subscriber`,
        ],
      },
    }
  })
}

function createFailedTxnEventRequest(
  failedTxns: TxnInfo[]
): v1.EventsApiCreateEventRequest[] {
  return failedTxns.map((errorLog) => {
    return {
      body: {
        aggregationKey: `FailedTxn-${errorLog.signature}}`,
        title: `FailedTxn-${errorLog.signature}`,
        text: JSON.stringify(errorLog),
        alertType: WARNING,
        tags: [
          `warning-type:FAILED-TXN`,
          `network:${CLUSTER}`,
          `service:token-dispenser-event-subscriber`,
        ],
      },
    }
  })
}

function createLowBalanceEventRequest(
  formattedTxnEvents: FormattedTxnEventInfo[]
): v1.EventsApiCreateEventRequest | undefined {
  if (formattedTxnEvents.length === 0) {
    return undefined
  }
  const mostRecentEvent = formattedTxnEvents.sort((a, b) => {
    return b.slot - a.slot
  })[0]
  if (
    mostRecentEvent.remainingBalance &&
    new BN(mostRecentEvent.remainingBalance).lt(new BN(LOW_BALANCE_THRESHOLD))
  ) {
    return {
      body: {
        aggregationKey: `LOW-BALANCE-${mostRecentEvent.signature}`,
        title: `LOW-BALANCE-${mostRecentEvent.signature}`,
        text: JSON.stringify(mostRecentEvent),
        alertType: WARNING,
        tags: [
          `warning-type:LOW-BALANCE`,
          `network:${CLUSTER}`,
          `service:token-dispenser-event-subscriber`,
        ],
      },
    }
  }
}

;(async () => {
  try {
    await main()
  } catch (e) {
    console.error(`error from datadog.ts: ${e}`)
    process.exit(1)
  }
})()
