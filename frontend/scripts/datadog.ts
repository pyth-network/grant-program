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
  TxnEventInfo,
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

  const { txnEvents, errorLogs } =
    await tokenDispenserEventSubscriber.parseTransactionLogs()

  const configuration = client.createConfiguration()
  const apiInstance = new v1.EventsApi(configuration)

  const txnEventRequests = createTxnEventRequest(txnEvents)
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

  const errorLogRequests = createErrorLogRequest(errorLogs)
  await Promise.all(
    errorLogRequests.map((errorLogRequest) => {
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
  txnEvents: TxnEventInfo[]
): v1.EventsApiCreateEventRequest[] {
  return txnEvents.map((txnEvent) => {
    const formattedEvent = formatTxnEventInfo(txnEvent)
    const { claimant, ecosystem, address } = formattedEvent

    return {
      body: {
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

function createErrorLogRequest(
  errorLogs: TxnInfo[]
): v1.EventsApiCreateEventRequest[] {
  return errorLogs.map((errorLog) => {
    return {
      body: {
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
