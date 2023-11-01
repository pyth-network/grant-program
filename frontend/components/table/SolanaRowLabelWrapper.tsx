import { Ecosystem } from '@components/Ecosystem'
import { RowLabelButton } from '@components/buttons/RowLabelButton'
import {
  BreakdownModal,
  BreakdownModalRowInfo,
} from '@components/modal/BreakdownModal'
import Defi from '@images/defi.inline.svg'
import Nft from '@images/nft.inline.svg'
import { useGetEcosystemIdentity } from 'hooks/useGetEcosystemIdentity'
import { useEffect, useState } from 'react'
import { SolanaBreakdown, fetchSolanaBreakdown } from 'utils/api'
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
          label: source === 'defi' ? 'DeFi Activity' : 'NFTs Held',
          icon: source === 'defi' ? <Defi /> : <Nft />,
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
          title={'Solana Breakdown'}
          info={breakdownModalRowInfo}
          openModal={openModal}
        />
      )}
    </>
  )
}
