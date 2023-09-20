import { Ecosystem } from '@components/Ecosystem'
import Modal from '@components/Modal'
import { Button } from '@components/buttons/Button'
import { BN } from '@coral-xyz/anchor'
import { useGetEcosystemIdentity } from 'hooks/useGetEcosystemIdentity'
import { useEffect, useState } from 'react'
import { fetchEvmBreakdown } from 'utils/api'
import { getEcosystemTableLabel } from 'utils/getEcosystemTableLabel'
import { toStringWithDecimals } from 'utils/toStringWithDecimals'

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
    useState<{ chain: string; amount: BN }[]>()

  useEffect(() => {
    if (identity === undefined) return
    ;async () => {
      const evmChainAllocation: { chain: string; amount: BN }[] | undefined =
        await fetchEvmBreakdown(identity)
      setChainAllocations(chainAllocations)
    }
  }, [chainAllocations, identity])

  if (chainAllocations === undefined)
    return <span className="font-header text-base18 font-thin">{label}</span>

  return (
    <>
      <Button onClick={() => {}} type={'primary'}>
        <span className="font-header text-base18 font-thin">{label}</span>
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

type EVMBreakdownModalProps = {
  openModal: Function
  chainAllocations: { chain: string; amount: BN }[]
}
function EVMBreakdownModal({
  openModal,
  chainAllocations,
}: EVMBreakdownModalProps) {
  return (
    <Modal openModal={openModal}>
      <h3 className="mb-8  font-header text-[36px] font-light">
        Evm Chains Breakdown
      </h3>
      <table>
        <tbody>
          {chainAllocations.map(({ chain, amount }) => {
            return (
              <tr key={chain}>
                <td>{chain}</td>
                <td>{toStringWithDecimals(amount)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Modal>
  )
}
