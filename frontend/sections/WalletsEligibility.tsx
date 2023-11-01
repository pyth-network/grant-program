import { useMemo } from 'react'

import Tooltip from '@components/Tooltip'
import NotVerified from '@images/not.inline.svg'
import Verified from '@images/verified.inline.svg'

import { Box } from '@components/Box'
import { Ecosystem } from '@components/Ecosystem'
import { useActivity } from '@components/Ecosystem/ActivityProvider'
import { useEligibility } from '@components/Ecosystem/EligibilityProvider'
import { EcosystemConnectButton } from '@components/EcosystemConnectButton'
import { BackButton } from '@components/buttons'
import { CoinCell } from '@components/table/CoinCell'
import { EcosystemRowLabel } from '@components/table/EcosystemRowLabel'
import { TotalAllocationRow } from '@components/table/TotalAllocationRow'
import { useCoins } from 'hooks/useCoins'
import { useGetEcosystemIdentity } from 'hooks/useGetEcosystemIdentity'
import { useTotalGrantedCoins } from 'hooks/useTotalGrantedCoins'
import { classNames } from 'utils/classNames'

const Eligibility = ({ onBack }: { onBack: () => void }) => {
  const totalGrantedCoins = useTotalGrantedCoins()

  return (
    <Box>
      <div className="flex items-center justify-between border-b border-light-35 bg-[#242339] py-4 px-4 md:py-8 md:px-10">
        <h4 className="font-header text-[20px] font-light leading-[1.2] sm:text-[28px]">
          Verify Eligibility
        </h4>
        <div className="flex gap-4">
          <BackButton onBack={onBack} />
        </div>
      </div>
      <table>
        <tbody>
          {Object.values(Ecosystem).map((ecosystem) => (
            <TableRow ecosystem={ecosystem} key={ecosystem} />
          ))}
          <TotalAllocationRow totalGrantedCoins={totalGrantedCoins} />
        </tbody>
      </table>
    </Box>
  )
}

type TableRowProps = {
  ecosystem: Ecosystem
}
function TableRow({ ecosystem }: TableRowProps) {
  const { activity } = useActivity()
  const getEcosystemIdentity = useGetEcosystemIdentity()
  const getEligibleCoins = useCoins()
  const { getEligibility } = useEligibility()

  const eligibility = getEligibility(ecosystem)
  const isActive = activity[ecosystem]
  const rowDisabled = isActive === false

  const identity = getEcosystemIdentity(ecosystem)
  const eligibleCoins = getEligibleCoins(ecosystem)

  const [tooltipContent, tooltipIcon] = useMemo(() => {
    if (isActive === false) return [undefined, <Verified key={null} />]

    if (ecosystem === Ecosystem.DISCORD) {
      if (identity === undefined) {
        return [
          'Please connect your Discord account to check eligibility.',
          <NotVerified key={null} />,
        ]
      } else {
        if (eligibility?.claimInfo === undefined) {
          return [
            'This Discord account is unfortunately not eligible for an allocation. You can click on your Discord username to disconnect and connect to another Discord account.',
            <NotVerified key={null} />,
          ]
        } else {
          if (eligibility.isClaimAlreadySubmitted === true) {
            return [
              'The allocated tokens for this Discord account have already been claimed. You can click on your Discord username to disconnect and connect to another Discord account.',
              <NotVerified key={null} />,
            ]
          } else {
            return [
              'Congratulations! Your Discord account is successfully connected.',
              <Verified key={null} />,
            ]
          }
        }
      }
    } else {
      if (identity === undefined) {
        return [
          'Please connect the relevant wallet to check eligibility.',
          <NotVerified key={null} />,
        ]
      } else {
        if (eligibility?.claimInfo === undefined) {
          return [
            'This wallet is unfortunately not eligible for an allocation. You can click on the wallet address to disconnect and connect to another wallet.',
            <NotVerified key={null} />,
          ]
        } else {
          if (eligibility.isClaimAlreadySubmitted === true) {
            return [
              'The allocated tokens for this wallet have already been claimed. You can click on the wallet address to disconnect and connect to another wallet.',
              <NotVerified key={null} />,
            ]
          } else {
            return [
              'Congratulations! This wallet is successfully connected. Click on the wallet address to disconnect to connect to another wallet.',
              <Verified key={null} />,
            ]
          }
        }
      }
    }
  }, [
    eligibility?.claimInfo,
    eligibility?.isClaimAlreadySubmitted,
    identity,
    isActive,
  ])

  return (
    <tr className={'border-b border-light-35'}>
      <td
        className={classNames(
          'w-full py-2 pl-4 pr-4 md:pl-10',
          rowDisabled ? 'opacity-25' : ''
        )}
      >
        <div
          className={classNames(
            'flex items-center justify-between',
            rowDisabled ? 'pointer-events-none' : ''
          )}
        >
          <EcosystemRowLabel ecosystem={ecosystem} />
          <span className={'flex items-center gap-2 sm:gap-5'}>
            <EcosystemConnectButton ecosystem={ecosystem} />
            <Tooltip content={tooltipContent}>{tooltipIcon}</Tooltip>
          </span>
        </div>
      </td>
      <CoinCell
        coins={eligibleCoins}
        isStriked={eligibility?.isClaimAlreadySubmitted}
      />
    </tr>
  )
}

export default Eligibility
