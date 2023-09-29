import Coin from '@images/coin.inline.svg'
import { ReactNode } from 'react'

export type DisplayCoinsProps = {
  coins: string | undefined | null
  icon?: ReactNode
}
export function DisplayCoins({ coins, icon }: DisplayCoinsProps) {
  return (
    <>
      {coins === undefined || coins === null ? (
        'N/A'
      ) : (
        <>
          {coins} {icon ?? <Coin />}
        </>
      )}
    </>
  )
}
