import Coin from '@images/coin.inline.svg'

export type DisplayCoinsProps = {
  coins: string | undefined | null
}
export function DisplayCoins({ coins }: DisplayCoinsProps) {
  return (
    <>
      {coins === undefined || coins === null ? (
        'N/A'
      ) : (
        <>
          {coins} <Coin />
        </>
      )}
    </>
  )
}
