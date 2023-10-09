import { useEligibility } from '@components/Ecosystem/EligibilityProvider'
import { EcosystemConnectButton } from '@components/EcosystemConnectButton'
import { useCoins } from 'hooks/useCoins'
import { useSignAndClaimRowState } from 'hooks/useSignAndClaimRowState'
import { classNames } from 'utils/classNames'
import { getEcosystemTableLabel } from 'utils/getEcosystemTableLabel'
import { CoinCell } from './CoinCell'
import { Ecosystem } from '@components/Ecosystem'
import { ReactNode } from 'react'

type SignAndClaimRowLayoutProps = {
  ecosystem: Ecosystem
  children?: ReactNode
}
export function SignAndClaimRowLayout({
  ecosystem,
  children,
}: SignAndClaimRowLayoutProps) {
  const getEligibleCoins = useCoins()
  const { getEligibility } = useEligibility()

  const eligibility = getEligibility(ecosystem)
  const eligibleCoins = getEligibleCoins(ecosystem)

  const { disabled: rowDisabled, tooltipContent: rowTooltipContent } =
    useSignAndClaimRowState(ecosystem)

  return (
    <tr className={classNames('border-b border-light-35 ')}>
      <td
        className={classNames(
          'w-full py-2 pl-10 pr-4',
          rowDisabled ? 'opacity-25' : ''
        )}
      >
        <div
          className={classNames(
            'flex items-center justify-between',
            rowDisabled ? 'pointer-events-none' : ''
          )}
        >
          <span className="min-w-[150px] font-header text-base18 font-thin">
            {getEcosystemTableLabel(ecosystem)}
          </span>

          <span className="flex flex-1  items-center justify-between gap-5">
            <EcosystemConnectButton
              ecosystem={ecosystem}
              disableOnConnect={true}
            />
            {children}
          </span>
        </div>
      </td>
      <CoinCell
        coins={eligibleCoins}
        isStriked={eligibility?.isClaimAlreadySubmitted}
        rowTooltipContent={rowTooltipContent}
      />
    </tr>
  )
}
