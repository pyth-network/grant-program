import Coin from '@images/coin.inline.svg'

export type TotalAllocationRowProps = {
  totalGrantedCoins: string
}
export function TotalAllocationRow({
  totalGrantedCoins,
}: TotalAllocationRowProps) {
  return (
    <tr className="border-b border-light-35 ">
      <td className="w-full bg-darkGray5 py-2 pl-10 pr-4">
        <div className="flex items-center justify-between">
          <span className="font-header text-base18 font-semibold">
            Eligible Token Allocation
          </span>
        </div>
      </td>
      <td className="min-w-[130px] border-l border-light-35 bg-dark-25">
        <span className=" flex min-h-[60px]  items-center justify-center gap-1 text-[20px] font-semibold">
          {totalGrantedCoins} <Coin />{' '}
        </span>
      </td>
    </tr>
  )
}
