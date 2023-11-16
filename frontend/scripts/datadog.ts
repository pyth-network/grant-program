/**
 * Post an event returns "OK" response
 *
 * To Run:
 * DD_SITE="datadoghq.com" DD_API_KEY="<DD_API_KEY>" ts-node ./scripts/datadog.ts
 */

import { client, v1 } from '@datadog/datadog-api-client'
import {
  FormattedTxnEventInfo,
  formatTxnEventInfo,
  TokenDispenserEventSubscriber,
  TxnInfo,
} from '../claim_sdk/eventSubscriber'
import * as anchor from '@coral-xyz/anchor'
import {
  ERROR,
  INFO,
} from '@datadog/datadog-api-client/dist/packages/datadog-api-client-v1/models/EventAlertType'
import { envOrErr } from '../claim_sdk'

const ENDPOINT = envOrErr('ENDPOINT')
const PROGRAM_ID = envOrErr('PROGRAM_ID')
const CLUSTER = envOrErr('CLUSTER')
const TIME_WINDOW_SECS = Number.parseInt(envOrErr('TIME_WINDOW_SECS'), 10)
const CHUNK_SIZE = Number.parseInt(envOrErr('CHUNK_SIZE'), 10)

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
              'API called successfully. Returned data: ' + JSON.stringify(data)
            )
          })
          .catch((error: any) => console.error(error))
      })
    )
  }

  const txnEventRequests = createTxnEventRequest(formattedTxnEvents)
  await Promise.all(
    txnEventRequests.map((txnEventRequest) => {
      apiInstance
        .createEvent(txnEventRequest)
        .then((data: v1.EventCreateResponse) => {
          console.log(
            'API called successfully. Returned data: ' + JSON.stringify(data)
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
            'API called successfully. Returned data: ' + JSON.stringify(data)
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

    const { ecosystem, address } = formattedEvent.claimInfo!

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
  console.log(`claimInfoMap.size: ${claimInfoMap.size}`)
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
        aggregationKey: `${errorLog.signature}`,
        title: `error-${errorLog.signature}`,
        text: JSON.stringify(errorLog),
        alertType: ERROR,
        tags: [
          `network:${CLUSTER}`,
          `service:token-dispenser-event-subscriber`,
        ],
      },
    }
  })
}

;(async () => {
  try {
    await main()
  } catch (e) {
    console.error(`error from datadog.ts: ${e}`)
    process.exit(1)
  }
})()
