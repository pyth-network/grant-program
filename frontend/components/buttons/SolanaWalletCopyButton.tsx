import Tooltip from '@components/Tooltip'
import { Button } from './Button'
import Copy from '@images/copy.inline.svg'
import { useState } from 'react'
import { truncateAddress } from 'utils/truncateAddress'
import { useGetEcosystemIdentity } from 'hooks/useGetEcosystemIdentity'
import { Ecosystem } from '@components/Ecosystem'

// This component will only render when solana wallet is connected
export function SolanaWalletCopyButton() {
  const solanaIdentity = useGetEcosystemIdentity()(Ecosystem.SOLANA)
  const [tooltipContent, setTooltipContent] = useState('copy')

  if (solanaIdentity === undefined) return <></>
  return (
    <div
      className="mt-2 w-max"
      onMouseEnter={() => setTooltipContent('copy')}
      onMouseDown={() => {
        setTooltipContent('copied')
      }}
    >
      <Tooltip content={tooltipContent} placement={'bottom'}>
        <Button
          onClick={() => navigator.clipboard.writeText(solanaIdentity)}
          type={'primary'}
        >
          {truncateAddress(solanaIdentity)} <Copy />
        </Button>
      </Tooltip>
    </div>
  )
}
