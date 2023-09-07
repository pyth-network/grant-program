import React, { useCallback, useState } from 'react'
import Modal from '../components/Modal'
import Eligibility2 from './SignForEligibleWallets'
import { useEligiblity } from '@components/Ecosystem/EligibilityProvider'
import { useSignature } from '@components/Ecosystem/SignatureProvider'
import { useTokenDispenserProvider } from '@components/TokenDispenserProvider'
import { Ecosystem } from '@components/Ecosystem'
import {
  useAptosAddress,
  useCosmosAddress,
  useEVMAddress,
  useSuiAddress,
} from 'hooks/useAddress'
import { useSession } from 'next-auth/react'
import { ProceedButton, BackButton } from '@components/buttons'
import { StepProps } from './common'

export const SignAndClaim = ({ onBack, onProceed }: StepProps) => {
  const [modal, openModal] = useState(false)
  const [screen, setScreen] = useState(1)
  const tokenDispenser = useTokenDispenserProvider()
  const { eligibility: eligibilityMap } = useEligiblity()
  const { signatureMap } = useSignature()

  const aptosAddress = useAptosAddress()
  const injectiveAddress = useCosmosAddress('injective')
  const osmosisAddress = useCosmosAddress('osmosis')
  const neutronAddress = useCosmosAddress('neutron')
  const evmAddress = useEVMAddress()
  const suiAddress = useSuiAddress()
  const { data } = useSession()

  const getClaim = useCallback(
    (
      ecosystem: Ecosystem,
      solanaIdentity?: string,
      ecosystemIdentity?: string | null
    ) => {
      if (solanaIdentity === undefined || !ecosystemIdentity) return

      const signatures = signatureMap[solanaIdentity]
      const signedMsg = signatures?.[ecosystem]?.[ecosystemIdentity]
      const eligibility = eligibilityMap[ecosystem][ecosystemIdentity]
      if (eligibility === undefined || signedMsg === undefined) return

      return {
        signedMessage: signedMsg,
        claimInfo: eligibility.claimInfo,
        proofOfInclusion: eligibility.proofOfInclusion,
      }
    },
    [eligibilityMap, signatureMap]
  )

  const submitTxs = useCallback(async () => {
    const solanaIdentity = tokenDispenser?.claimant.toBase58()

    // get claims for only those ecosystem which are connected by the user
    const claims = [
      getClaim(Ecosystem.APTOS, solanaIdentity, aptosAddress),
      getClaim(Ecosystem.EVM, solanaIdentity, evmAddress),
      getClaim(Ecosystem.INJECTIVE, solanaIdentity, injectiveAddress),
      getClaim(Ecosystem.NEUTRON, solanaIdentity, neutronAddress),
      getClaim(Ecosystem.OSMOSIS, solanaIdentity, osmosisAddress),
      getClaim(Ecosystem.SOLANA, solanaIdentity, solanaIdentity),
      getClaim(Ecosystem.SUI, solanaIdentity, suiAddress),
      getClaim(Ecosystem.DISCORD, solanaIdentity, data?.user?.name),
    ].filter((claim) => claim !== undefined)

    // @ts-ignore fitlering undefined in the previous step
    await tokenDispenser?.submitClaims(claims)
  }, [
    aptosAddress,
    data?.user?.name,
    evmAddress,
    getClaim,
    injectiveAddress,
    neutronAddress,
    osmosisAddress,
    suiAddress,
    tokenDispenser,
  ])

  return (
    <>
      {screen == 1 ? (
        <div className=" border border-light-35 bg-dark">
          <h4 className="border-b border-light-35 bg-[#242339] py-8 px-10  font-header text-[28px] font-light leading-[1.2]">
            Sign Your Wallets and Claim
          </h4>
          <div className="px-10 py-8 text-base16">
            <p className="mb-6">
              Please sign your connected wallets. To sign, click the
              corresponding “sign” button for each wallet. Your wallet will ask
              if you wish to sign the transaction. Confirm by clicking “sign” in
              your wallet’s pop-up window.
            </p>
            <p>Your claimed PYTH tokens will go to this Solana wallet:</p>

            <div className="mt-12 flex justify-end gap-4">
              <BackButton onBack={onBack} />
              <ProceedButton onProceed={() => setScreen(2)} />
            </div>
          </div>
        </div>
      ) : (
        <Eligibility2
          onBack={() => setScreen(1)}
          onProceed={() => openModal(true)}
        />
      )}
      {modal && (
        <Modal openModal={openModal}>
          <h3 className="mb-8  font-header text-[36px] font-light">
            Claim Airdrop
          </h3>
          <p className="mx-auto max-w-[454px] font-body text-base16">
            Please ensure that you have connected all the necessary wallets and
            the Discord account with your claim. Additionally, you can repeat
            the Airdrop Claim process using a different set of wallets.
          </p>
          <div className="mt-12 flex justify-center gap-4">
            <BackButton onBack={() => openModal(false)} />
            <ProceedButton
              onProceed={async () => {
                await submitTxs()
                onProceed()
              }}
            />
          </div>
        </Modal>
      )}
    </>
  )
}
