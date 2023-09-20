import Coin from '@images/coin.inline.svg'
import Tooltip from '@components/Tooltip'

export type CoinCellProps = {
  coins: string
  isStriked?: boolean
  rowTooltipContent?: string
}

export function CoinCell({
  coins,
  isStriked,
  rowTooltipContent,
}: CoinCellProps) {
  return (
    <td className="min-w-[130px] border-l border-light-35 bg-dark-25">
      <Tooltip content={rowTooltipContent} placement={'right'}>
        <span className="flex items-center justify-center  gap-1 text-[20px]">
          {isStriked ? <s>{coins}</s> : <>{coins}</>} <Coin />
        </span>
      </Tooltip>
    </td>
  )
}
