import { useEligibility } from '@components/Ecosystem/EligibilityProvider'
import { EcosystemConnectButton } from '@components/EcosystemConnectButton'
import { useCoins } from 'hooks/useCoins'
import { useSignAndClaimRowState } from 'hooks/useSignAndClaimRowState'
import { classNames } from 'utils/classNames'
import { CoinCell } from './CoinCell'
import { Ecosystem } from '@components/Ecosystem'
import { ReactNode } from 'react'
import { EcosystemRowLabel } from './EcosystemRowLabel'

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

  const isMobile = window.innerWidth < 480

  return (
    <tr className={classNames('border-b border-light-35 ')}>
      <td
        className={classNames(
          'w-full py-2 pl-4 pr-4 sm:pl-10',
          rowDisabled ? 'opacity-25' : ''
        )}
      >
        <div
          className={classNames(
            'flex items-center justify-between',
            rowDisabled ? 'pointer-events-none' : ''
          )}
        >
          <span className="flex min-h-[36px] items-center sm:min-w-[170px]">
            <EcosystemRowLabel ecosystem={ecosystem} />
          </span>
          <span className="flex items-center justify-around gap-2 sm:flex-1 sm:gap-5">
            {!isMobile && (
              <span className="mr-auto">
                <EcosystemConnectButton
                  ecosystem={ecosystem}
                  disableOnConnect={true}
                />
              </span>
            )}
            <span className="">{children}</span>
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
