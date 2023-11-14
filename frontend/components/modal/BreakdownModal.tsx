import { ModalCloseButton } from '@components/modal/ModalCloseButton'
import { ModalWrapper } from '@components/modal/ModalWrapper'
import BN from 'bn.js'
import { toStringWithDecimals } from 'utils/toStringWithDecimals'
import Pyth from '@images/coin.inline.svg'
import { ReactNode } from 'react'

export type BreakdownModalRowInfo = {
  label: string
  icon?: ReactNode
  amount: BN
}

type BreakdownModalProps = {
  title: string
  openModal: Function
  info: BreakdownModalRowInfo[]
}
export function BreakdownModal({
  title,
  openModal,
  info,
}: BreakdownModalProps) {
  return (
    <ModalWrapper>
      <div className="relative max-h-[80vh] w-full max-w-[588px] bg-darkGray1">
        <ModalCloseButton onClick={() => openModal(false)} />
        <h3 className=" border-x border-t border-light-35 p-4 font-header text-[24px] font-light sm:p-10 sm:text-[36px]">
          {title}
        </h3>
        <table className="w-full border-collapse bg-[#1B1A2C] font-header text-base18 font-light">
          <tbody className="scrollbar block max-h-[70vh]">
            {info.map(({ label, icon, amount }) => {
              return (
                <tr key={label}>
                  <td className="w-full max-w-[440px] border-collapse border border-light-35 py-4 px-4 sm:px-10">
                    <span className="flex items-center justify-start gap-2">
                      {icon}
                      {label}
                    </span>
                  </td>
                  <td className="border-collapse border border-light-35 py-4">
                    <span className="flex items-center justify-end gap-1 px-10">
                      {toStringWithDecimals(amount)} <Pyth />
                    </span>
                  </td>
                </tr>
              )
            })}

            <tr className="bg-darkGray1">
              <td className="w-full max-w-[440px] border-collapse border border-light-35 py-4 px-4 sm:px-10">
                {'Total'}
              </td>
              <td className="border-collapse border border-light-35 py-4">
                <span className="flex items-center justify-end gap-1 px-10">
                  {toStringWithDecimals(
                    info.reduce(
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
