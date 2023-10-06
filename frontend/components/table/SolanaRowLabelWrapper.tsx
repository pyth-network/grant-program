import { Ecosystem } from '@components/Ecosystem'
import { RowLabelButton } from '@components/buttons/RowLabelButton'
import {
  BreakdownModalRowInfo,
  BreakdownModal,
} from '@components/modal/BreakdownModal'
import { useGetEcosystemIdentity } from 'hooks/useGetEcosystemIdentity'
import { useState, useEffect } from 'react'
import { SolanaBreakdown, fetchSolanaBreakdown } from 'utils/api'
import { capitalizeFirstLetter } from 'utils/capitalizeFirstLetter'
import { getEcosystemTableLabel } from 'utils/getEcosystemTableLabel'

export function SolanaRowLabelWrapper() {
  const label = getEcosystemTableLabel(Ecosystem.SOLANA)
  const [modal, openModal] = useState(false)
  const identity = useGetEcosystemIdentity()(Ecosystem.SOLANA)
  const [breakdownModalRowInfo, setBreakdownModalRowInfo] =
    useState<BreakdownModalRowInfo[]>()

  useEffect(() => {
    if (identity === undefined) {
      setBreakdownModalRowInfo(undefined)
      return
    }
    ;(async () => {
      const solanaChainAllocations: SolanaBreakdown[] | undefined =
        await fetchSolanaBreakdown(identity)

      setBreakdownModalRowInfo(
        solanaChainAllocations?.map(({ source, amount }) => ({
          label: capitalizeFirstLetter(source),
          amount,
        }))
      )
    })()
  }, [setBreakdownModalRowInfo, identity])

  if (breakdownModalRowInfo === undefined)
    return <span className="font-header text-base18 font-thin">{label}</span>

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
          title={'Solana Breakdown'}
          info={breakdownModalRowInfo}
          openModal={openModal}
        />
      )}
    </>
  )
}
