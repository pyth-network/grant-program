import { Ecosystem } from '@components/Ecosystem'
import Modal from '@components/Modal'
import { Button } from '@components/buttons/Button'
import { BN } from '@coral-xyz/anchor'
import { useGetEcosystemIdentity } from 'hooks/useGetEcosystemIdentity'
import { useEffect, useState } from 'react'
import { EvmChainAllocation, fetchEvmBreakdown } from 'utils/api'
import { capitalizeFirstLetter } from 'utils/capitalizeFirstLetter'
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
        <span className="border-b border-light pb-1 font-header text-base18 font-thin">
          {label}
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

type EVMBreakdownModalProps = {
  openModal: Function
  chainAllocations: EvmChainAllocation[]
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
      <div className="mx-14 border-b border-b-light-35">
        {chainAllocations.map(({ chain, amount }) => {
          return (
            <div
              key={chain}
              className=" flex justify-between px-10 text-base16"
            >
              <div>{capitalizeFirstLetter(chain.split('-')[0])}</div>
              <div className="w-16 border-l border-light-35 pb-1 ">
                {toStringWithDecimals(amount)}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mx-14 opacity-75">
        <div className=" flex justify-between px-10">
          <div>{'Total'}</div>
          <div className="w-16 border-l border-light-35">
            {toStringWithDecimals(
              chainAllocations.reduce(
                (prevValue, { amount }) => prevValue.add(amount),
                new BN(0)
              )
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
