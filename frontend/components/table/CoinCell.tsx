import Tooltip from '@components/Tooltip'
import { classNames } from 'utils/classNames'
import Coin from '@images/coin.inline.svg'

export type CoinCellProps = {
  coins?: string
  isStriked?: boolean
  rowTooltipContent?: string
}

export function CoinCell({
  coins,
  isStriked,
  rowTooltipContent,
}: CoinCellProps) {
  return (
    <td className=" border-l border-light-35 bg-dark-25">
      <Tooltip content={rowTooltipContent} placement={'right'}>
        <span
          className={classNames(
            'flex items-center justify-center gap-1 text-[14px] sm:text-[20px]',
            isStriked ? 'line-through' : ''
          )}
        >
          {!coins ? (
            'N/A'
          ) : (
            <>
              {coins} <Coin />
            </>
          )}
        </span>
      </Tooltip>
    </td>
  )
}
