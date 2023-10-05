import { ModalCloseButton } from '@components/modal/ModalCloseButton'
import { ModalWrapper } from '@components/modal/ModalWrapper'
import BN from 'bn.js'
import { EvmChainAllocation } from 'utils/api'
import { toStringWithDecimals } from 'utils/toStringWithDecimals'
import Pyth from '@images/coin.inline.svg'
import { Chain, EvmBreakdownLabel } from './EvmBreakdownLabel'

type EVMBreakdownModalProps = {
  openModal: Function
  chainAllocations: EvmChainAllocation[]
}
export function EVMBreakdownModal({
  openModal,
  chainAllocations,
}: EVMBreakdownModalProps) {
  return (
    <ModalWrapper>
      <div className="relative w-full max-w-[588px]  bg-darkGray1">
        <ModalCloseButton onClick={() => openModal(false)} />
        <h3 className="border-x border-t border-light-35 p-10 font-header text-[36px] font-light">
          EVM Chains Breakdown
        </h3>
        <table className="w-full border-collapse  bg-[#1B1A2C] font-header text-base18 font-light">
          <tbody>
            {chainAllocations.map(({ chain, amount }) => {
              return (
                <tr key={chain}>
                  <td className="w-full max-w-[440px] border-collapse border border-light-35 py-4 px-10">
                    <EvmBreakdownLabel chain={chain as Chain} />
                  </td>
                  <td className="border-collapse border border-light-35 py-4">
                    <span className="flex w-[148px] items-center justify-end gap-1 px-10">
                      {toStringWithDecimals(amount)} <Pyth />
                    </span>
                  </td>
                </tr>
              )
            })}

            <tr className="bg-darkGray1">
              <td className="w-full max-w-[440px] border-collapse border border-light-35 py-4 px-10">
                {'Total'}
              </td>
              <td className="border-collapse border border-light-35 py-4">
                <span className="flex w-[148px] items-center justify-end gap-1 px-10">
                  {toStringWithDecimals(
                    chainAllocations.reduce(
                      (prevValue, { amount }) => prevValue.add(amount),
                      new BN(0)
                    )
                  )}{' '}
                  <Pyth />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </ModalWrapper>
  )
}
