import React from 'react'
import { ProceedButton } from '@components/buttons'
import { Box } from '@components/Box'

export const Welcome = ({ onProceed }: { onProceed: () => void }) => {
  return (
    <>
      <Box>
        <h4 className="border-b border-light-35 bg-[#242339] py-8 px-10  font-header text-[28px] font-light leading-[1.2]">
          Welcome to the Pyth Airdrop Claim Process
        </h4>
        <div className="px-10 py-8 text-base16">
          <p className="mb-6">
            As part of the Pyth Network’s recent governance initiative, PYTH
            tokens have been allocated to the community.
          </p>
          <p className="mb-6">
            You may be eligible for the Pyth Airdrop if you:
          </p>
          <ul className="claim-ul mb-6">
            <li>
              Interacted with apps that use Pyth data on any supported
              blockchain, including Solana, Aptos, Sui, Cosmos, and the EVM
              ecosystem.
            </li>
            <li>
              Received and held Pyth NFT’s from official Pyth community
              activities.
            </li>
            <li>
              Received special community roles in the official Pyth Discord
              server.
            </li>
          </ul>
          <p>
            This Claim Process will check your wallet activity and Discord
            account to calculate how many PYTH tokens you are eligible to claim.
          </p>
          <div className="mt-12 flex justify-end">
            <ProceedButton onProceed={onProceed} />
          </div>
        </div>
      </Box>
    </>
  )
}
