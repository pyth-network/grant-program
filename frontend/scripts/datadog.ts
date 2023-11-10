/**
 * Post an event returns "OK" response
 *
 * To Run:
 * DD_SITE="datadoghq.com" DD_API_KEY="<DD_API_KEY>" tsc "example.ts"
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
  INFO,
  WARNING,
} from '@datadog/datadog-api-client/dist/packages/datadog-api-client-v1/models/EventAlertType'
import { envOrErr } from '../claim_sdk'

const ENDPOINT = envOrErr('ENDPOINT')
const PROGRAM_ID = envOrErr('PROGRAM_ID')

async function main() {
  const tokenDispenserEventSubscriber = new TokenDispenserEventSubscriber(
    ENDPOINT,
    new anchor.web3.PublicKey(PROGRAM_ID),
    10 * 60,
    {
      commitment: 'confirmed',
    }
  )

  const { txnEvents, errorLogs } =
    await tokenDispenserEventSubscriber.parseTransactionLogs()

  const configuration = client.createConfiguration()
  const apiInstance = new v1.EventsApi(configuration)

  // # An example is: PriceFeedOfflineCheck-Crypto.AAVE/USD
  // 	aggregation_key = f"{self.check.__class__.__name__}-{self.check.state().symbol}"
  //
  // 	if self.check.__class__.__bases__ == (PublisherCheck,):
  // # Add publisher key to the aggregation key to separate different faulty publishers
  // # An example would be: PublisherPriceCheck-Crypto.AAVE/USD-9TvAYCUkGajRXs....
  // 	aggregation_key += "-" + self.check.state().public_key.key
  //
  // 	event = DatadogAPIEvent(
  // 		aggregation_key=aggregation_key,
  // 		title=text.split("\n")[0],
  // 		text=text,
  // 		tags=[
  // 			"service:observer",
  // 			f"network:{self.context['network']}",
  // 			f"symbol:{self.check.state().symbol}",
  // 			f"check:{self.check.__class__.__name__}",
  // 		],
  // 		alert_type=EventAlertType.WARNING,
  // 		source_type_name="my_apps",
  // 	)
  // 74000000000
  // const {
  // 	claimant,
  // 	claimAmount,
  // 	ecosystem,
  // 	address,
  // } = event;
  // example datadog event
  // title: Crypto.GRAIL/USD is too far at the price service.
  // aggregation_key: PriceFeedCrossChainDeviationCheck-Crypto.GRAIL/USD
  // text:
  //  Crypto.GRAIL/USD is too far at the price service.
  //
  //  Price: 1876.14745716
  //  Price at price service: 1618.41120956

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
          //TODO: add cluster name to the tag
          `network:solana-mainnet`,
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
        alertType: WARNING,
        tags: [
          //TODO: add cluster name to the tag
          `network:solana-mainnet`,
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
