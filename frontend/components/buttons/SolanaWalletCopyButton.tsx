import Tooltip from '@components/Tooltip'
import { Button } from './Button'
import Copy from '@images/copy.inline.svg'
import { useState } from 'react'
import { truncateAddress } from 'utils/truncateAddress'
import { useGetEcosystemIdentity } from 'hooks/useGetEcosystemIdentity'
import { Ecosystem } from '@components/Ecosystem'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletIcon } from '@components/wallets/WalletButton'

// This component will only render when solana wallet is connected
export function SolanaWalletCopyButton() {
  const solanaIdentity = useGetEcosystemIdentity()(Ecosystem.SOLANA)
  const [tooltipContent, setTooltipContent] = useState('copy')
  const { wallet } = useWallet()

  if (solanaIdentity === undefined) return <></>
  return (
    <div
      className="w-max"
      onMouseEnter={() => setTooltipContent('copy')}
      onMouseDown={() => {
        setTooltipContent('copied')
      }}
    >
      <Tooltip content={tooltipContent} placement={'bottom'}>
        <Button
          onClick={() => navigator.clipboard.writeText(solanaIdentity)}
          type={'secondary'}
        >
          <WalletIcon icon={wallet?.adapter.icon} />
          {truncateAddress(solanaIdentity)} <Copy />
        </Button>
      </Tooltip>
    </div>
  )
}
