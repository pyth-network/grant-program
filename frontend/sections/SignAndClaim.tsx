import React, { useCallback, useState } from 'react'
import Modal from '@components/Modal'
import Eligibility2 from './SignForEligibleWallets'
import { useTokenDispenserProvider } from '@components/TokenDispenserProvider'
import { useConnectedAndSignedEcosystem } from 'hooks/useConnectedAndSignedEcosystem'
import { useGetClaim } from 'hooks/useGetClaim'
import { Ecosystem } from '@components/Ecosystem'
import { ProceedButton, BackButton } from '@components/buttons'
import { StepProps } from './common'

// Following the convention,
// If undefined we still have to fetch
// If null we have fetched
export type EcosystemClaimState = {
  transactionSignature: string | undefined | null
  loading: boolean
  error: any | undefined | null
}

export const SignAndClaim = ({ onBack, onProceed }: StepProps) => {
  const [modal, openModal] = useState(false)
  const [screen, setScreen] = useState(1)
  const tokenDispenser = useTokenDispenserProvider()
  const [ecosystemState, setEcosystemState] =
    useState<{ [key in Ecosystem]?: EcosystemClaimState }>()

  const ecosystems = useConnectedAndSignedEcosystem()
  const getClaim = useGetClaim()

  const submitTxs = useCallback(async () => {
    // This checks that the solana wallet is connected
    if (tokenDispenser === undefined) return
    // Since we are fetching claim for only those ecosystem which are connected
    // and as we have checked that a solana wallet is connected in above step
    // `getClaim` call should not return undefined
    const claims = ecosystems.map((ecosystem) => getClaim(ecosystem)!)

    const stateObj: { [key in Ecosystem]?: EcosystemClaimState } = {}
    ecosystems.forEach((ecosystem) => {
      stateObj[ecosystem] = {
        transactionSignature: undefined,
        loading: true,
        error: undefined,
      }
    })
    setEcosystemState(stateObj)
    try {
      const broadcastPromises = await tokenDispenser?.submitClaims(claims)
      broadcastPromises.forEach(async (broadcastPromise, index) => {
        try {
          const transactionSignature = await broadcastPromise
          // NOTE: there is an implicit order restriction
          // Transaction Order should be same as Ecosystems array order
          setEcosystemState((ecosystemState) => ({
            ...ecosystemState,
            [ecosystems[index]]: {
              transactionSignature,
              loading: false,
              error: null,
            },
          }))
        } catch (error) {
          setEcosystemState((ecosystemState) => ({
            ...ecosystemState,
            [ecosystems[index]]: {
              transactionSignature: null,
              loading: false,
              error,
            },
          }))
        }
      })
    } catch (e) {
      console.error(e)
      const newStateObj: { [key in Ecosystem]?: EcosystemClaimState } = {}
      ecosystems.forEach((ecosystem) => {
        newStateObj[ecosystem] = {
          transactionSignature: null,
          loading: false,
          error: e,
        }
      })

      setEcosystemState(newStateObj)
    }
  }, [ecosystems, getClaim, tokenDispenser])

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
          ecosystemState={ecosystemState}
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
                openModal(false)
                await submitTxs()
              }}
            />
          </div>
        </Modal>
      )}
    </>
  )
}
