import Tooltip from '@components/Tooltip'
import { classNames } from 'utils/classNames'
import { DisplayCoins } from '@components/Coins'

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
    <td className="min-w-[130px] border-l border-light-35 bg-dark-25">
      <Tooltip content={rowTooltipContent} placement={'right'}>
        <span
          className={classNames(
            'flex items-center justify-center  gap-1 text-[20px]',
            isStriked ? 'line-through' : ''
          )}
        >
          <DisplayCoins coins={coins} />
        </span>
      </Tooltip>
    </td>
  )
}
