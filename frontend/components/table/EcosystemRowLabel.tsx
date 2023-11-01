import { Ecosystem } from '@components/Ecosystem'
import { getEcosystemTableLabel } from 'utils/getEcosystemTableLabel'
import { EVMRowLabelWrapper } from './EvmRowLabelWrapper'
import { SolanaRowLabelWrapper } from './SolanaRowLabelWrapper'

export function EcosystemRowLabel({ ecosystem }: { ecosystem: Ecosystem }) {
  if (ecosystem === Ecosystem.EVM) return <EVMRowLabelWrapper />
  if (ecosystem === Ecosystem.SOLANA) return <SolanaRowLabelWrapper />
  return (
    <span className="pr-2 font-header text-base font-thin leading-none sm:text-base18">
      {getEcosystemTableLabel(ecosystem)}
    </span>
  )
}
