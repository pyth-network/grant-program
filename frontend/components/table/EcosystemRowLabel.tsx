import { Ecosystem } from '@components/Ecosystem'
import { EVMRowLabelWrapper } from './EvmRowLabelWrapper'
import { SolanaRowLabelWrapper } from './SolanaRowLabelWrapper'
import { getEcosystemTableLabel } from 'utils/getEcosystemTableLabel'

export function EcosystemRowLabel({ ecosystem }: { ecosystem: Ecosystem }) {
  if (ecosystem === Ecosystem.EVM) return <EVMRowLabelWrapper />
  if (ecosystem === Ecosystem.SOLANA) return <SolanaRowLabelWrapper />
  return (
    <span className="font-header text-base18 font-thin">
      {getEcosystemTableLabel(ecosystem)}
    </span>
  )
}
