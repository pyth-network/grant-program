import { Box } from '@components/Box'
import { BackButton, ProceedButton } from '@components/buttons'
import { WalletConnectedButton } from '@components/wallets/WalletButton'
import { useWallet } from '@solana/wallet-adapter-react'
import { useMemo } from 'react'
import { truncateAddress } from 'utils/truncateAddress'
import { StepProps } from './common'

export const LoggedInSolana = ({ onBack, onProceed }: StepProps) => {
  const { publicKey, wallet, disconnect } = useWallet()

  const base58 = useMemo(() => publicKey?.toBase58(), [publicKey])

  return (
    <Box>
      <div className="flex items-center justify-between border-b border-light-35  bg-[#242339] py-8 px-4 sm:px-10">
        <h4 className="font-header text-[28px] font-light leading-[1.2]">
          Log in with Solana
        </h4>
        <BackButton onBack={onBack} />
      </div>
      <div className="px-4 py-8 text-base sm:px-10 sm:text-base16">
        <p className="mb-6">
          PYTH tokens are native to Solana. You need a Solana wallet to receive
          your tokens. Your claimed PYTH tokens will go to the Solana wallet you
          have connected in the previous step.
        </p>
        <p className="">
          To change the connected wallet please go to the previous step.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <WalletConnectedButton
            onClick={disconnect}
            address={truncateAddress(base58) ?? ''}
            icon={wallet?.adapter.icon}
            disabled={true}
          />
          <ProceedButton onProceed={onProceed} />
        </div>
      </div>
    </Box>
  )
}
