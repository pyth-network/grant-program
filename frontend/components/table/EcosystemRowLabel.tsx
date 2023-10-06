import { Ecosystem } from '@components/Ecosystem'
import { Button } from '@components/buttons/Button'
import { useGetEcosystemIdentity } from 'hooks/useGetEcosystemIdentity'
import { useEffect, useState } from 'react'
import { EvmChainAllocation, fetchEvmBreakdown } from 'utils/api'
import { getEcosystemTableLabel } from 'utils/getEcosystemTableLabel'

import Tooltip from '@images/tooltip-purple.inline.svg'
import { EVMBreakdownModal } from '@components/evm-breakdown/EvmBreakdown'

export function EcosystemRowLabel({ ecosystem }: { ecosystem: Ecosystem }) {
  if (ecosystem === Ecosystem.EVM)
    return <EVMRowLabelWrapper label={getEcosystemTableLabel(ecosystem)} />
  return (
    <span className="font-header text-base18 font-thin">
      {getEcosystemTableLabel(ecosystem)}
    </span>
  )
}

function EVMRowLabelWrapper({ label }: { label: string }) {
  const [modal, openModal] = useState(false)
  const identity = useGetEcosystemIdentity()(Ecosystem.EVM)
  const [chainAllocations, setChainAllocations] =
    useState<EvmChainAllocation[]>()

  useEffect(() => {
    if (identity === undefined) {
      setChainAllocations(undefined)
      return
    }
    ;(async () => {
      const evmChainAllocation: EvmChainAllocation[] | undefined =
        await fetchEvmBreakdown(identity)
      setChainAllocations(evmChainAllocation)
    })()
  }, [setChainAllocations, identity])

  if (chainAllocations === undefined)
    return <span className="font-header text-base18 font-thin">{label}</span>

  return (
    <>
      <Button
        onClick={() => {
          openModal(true)
        }}
        type={'tertiary'}
      >
        <span className="flex items-center gap-2 font-header text-base18 font-semibold">
          {label} <Tooltip />
        </span>
      </Button>
      {modal && (
        <EVMBreakdownModal
          chainAllocations={chainAllocations}
          openModal={openModal}
        />
      )}
    </>
  )
}
