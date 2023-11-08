import { Ecosystem } from '@components/Ecosystem'
import { EvmLogo } from '@components/EvmLogo'
import { RowLabelButton } from '@components/buttons/RowLabelButton'
import {
  BreakdownModal,
  BreakdownModalRowInfo,
} from '@components/modal/BreakdownModal'
import { useGetEcosystemIdentity } from 'hooks/useGetEcosystemIdentity'
import { useEffect, useState } from 'react'
import { EvmChainAllocation, fetchEvmBreakdown } from 'utils/api'
import { getEcosystemTableLabel } from 'utils/getEcosystemTableLabel'
import { getEvmName } from 'utils/getEvmName'

export function EVMRowLabelWrapper() {
  const label = getEcosystemTableLabel(Ecosystem.EVM)
  const [modal, openModal] = useState(false)
  const identity = useGetEcosystemIdentity()(Ecosystem.EVM)
  const [breakdownModalRowInfo, setBreakdownModalRowInfo] =
    useState<BreakdownModalRowInfo[]>()

  useEffect(() => {
    if (identity === undefined) {
      setBreakdownModalRowInfo(undefined)
      return
    }
    ;(async () => {
      const evmChainAllocations: EvmChainAllocation[] | undefined =
        await fetchEvmBreakdown(identity)
      setBreakdownModalRowInfo(
        evmChainAllocations?.map(({ chain, amount }) => ({
          label: getEvmName(chain),
          icon: <EvmLogo chain={chain} />,
          amount,
        }))
      )
    })()
  }, [setBreakdownModalRowInfo, identity])

  if (breakdownModalRowInfo === undefined)
    return (
      <span className="pr-2 font-header text-base font-thin leading-none sm:text-base18">
        {label}
      </span>
    )

  return (
    <>
      <RowLabelButton
        onClick={() => {
          openModal(true)
        }}
        label={label}
      />
      {modal && (
        <BreakdownModal
          title={'EVM Chains Breakdown'}
          info={breakdownModalRowInfo}
          openModal={openModal}
        />
      )}
    </>
  )
}
