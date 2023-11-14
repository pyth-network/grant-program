import Coin from '@images/coin.inline.svg'

export type TotalAllocationRowProps = {
  totalGrantedCoins: string
}
export function TotalAllocationRow({
  totalGrantedCoins,
}: TotalAllocationRowProps) {
  return (
    <tr className="border-b border-light-35 ">
      <td className="w-full bg-darkGray5 py-2 pl-4 pr-4 sm:pl-10">
        <div className="flex justify-between">
          <span className="font-header text-[14px] font-semibold sm:text-base18">
            Eligible Token Allocation
          </span>
        </div>
      </td>
      <td className="min-w-[80px] border-l border-light-35 bg-dark-25 sm:min-w-[130px]">
        <span className="flex min-h-[60px] items-center justify-center gap-1 text-[14px] font-semibold sm:text-[20px]">
          {totalGrantedCoins} <Coin />{' '}
        </span>
      </td>
    </tr>
  )
}
