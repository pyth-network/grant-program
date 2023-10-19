import React, { useCallback, useEffect, useState } from 'react'
import Modal from '@components/Modal'
import { SignForEligibleWallets } from './SignForEligibleWallets'
import { useTokenDispenserProvider } from 'hooks/useTokenDispenserProvider'
import { useGetClaim } from 'hooks/useGetClaim'
import { Ecosystem } from '@components/Ecosystem'
import { ProceedButton, BackButton } from '@components/buttons'
import { StepProps } from './common'
import { SignedMessage } from 'claim_sdk/ecosystems/signatures'
import { ClaimInfo } from 'claim_sdk/claim'
import { ClaimStatus } from './ClaimStatus'
import { useEligibility } from '@components/Ecosystem/EligibilityProvider'
import { BN } from '@coral-xyz/anchor'
import { toStringWithDecimals } from 'utils/toStringWithDecimals'
import { Box } from '@components/Box'
import { SolanaWalletCopyButton } from '@components/buttons/SolanaWalletCopyButton'
import { setLastStepStatus } from 'pages/_app'
import { ERROR_FUNDING_TX, ERROR_SIGNING_TX } from 'claim_sdk/solana'

// Following the convention,
// If error is:
// - undefined, the transaction hasn't landed yet
// - null, the transaction has been successful
// - defined, the transaction has failed
export type EcosystemClaimState = {
  error: Error | undefined | null
}

type SignAndClaimProps = {
  onBack: () => void
  onProceed: (totalTokensClaimed: string) => void
}

export const SignAndClaim = ({ onBack, onProceed }: SignAndClaimProps) => {
  const [modal, openModal] = useState(false)
  const [screen, setScreen] = useState(1)
  const tokenDispenser = useTokenDispenserProvider()
  const [ecosystemsClaimState, setEcosystemsClaimState] =
    useState<{ [key in Ecosystem]?: EcosystemClaimState }>()
  const getClaim = useGetClaim()
  const { getEligibility } = useEligibility()

  const totalCoinsClaimed = useCallback(() => {
    if (ecosystemsClaimState !== undefined) {
      let totalCoinsClaimed = new BN(0)
      Object.keys(ecosystemsClaimState).forEach((ecosystem) => {
        if (ecosystemsClaimState[ecosystem as Ecosystem]?.error === null) {
          const eligibility = getEligibility(ecosystem as Ecosystem)
          if (eligibility?.claimInfo.amount !== undefined)
            totalCoinsClaimed = totalCoinsClaimed.add(
              eligibility?.claimInfo.amount
            )
        }
      })
      return toStringWithDecimals(totalCoinsClaimed)
    } else return 'N/A'
  }, [ecosystemsClaimState, getEligibility])

  // Calculating total tokens that has been claimed
  // using the ecosystemsClaimState
  const onProceedWrapper = useCallback(() => {
    onProceed(totalCoinsClaimed())
  }, [onProceed, totalCoinsClaimed])

  const submitTxs = useCallback(async () => {
    window.onbeforeunload = (e) => {
      e.preventDefault()
      return ''
    }
    // This checks that the solana wallet is connected
    if (tokenDispenser === undefined) return
    const ecosystems: Ecosystem[] = []
    const claims: {
      signedMessage: SignedMessage
      claimInfo: ClaimInfo
      proofOfInclusion: Uint8Array[]
    }[] = []

    // Since we are fetching claim for only those ecosystem which are connected
    // and as we have checked that a solana wallet is connected in above step
    // `getClaim` call should not return undefined
    Object.values(Ecosystem).forEach((ecosystem) => {
      const claim = getClaim(ecosystem)
      if (claim !== undefined) {
        claims.push(claim)
        ecosystems.push(ecosystem)
      }
    })

    const stateObj: { [key in Ecosystem]?: EcosystemClaimState } = {}
    ecosystems.forEach((ecosystem) => {
      stateObj[ecosystem] = {
        error: undefined,
      }
    })
    setEcosystemsClaimState(stateObj)

    let totalCoinsClaimed = new BN(0)
    let broadcastPromises
    try {
      broadcastPromises = await tokenDispenser?.submitClaims(claims)
    } catch (e) {
      const err = e as Error
      let message: string
      if (
        err.message === ERROR_SIGNING_TX ||
        err.message === ERROR_FUNDING_TX
      ) {
        message =
          'There was some error while signing the transaction. Please refresh the page and try again.'
      } else {
        message =
          'There was some unknown error. Please refresh to try again or come back later.'
      }

      const stateObj: { [key in Ecosystem]?: EcosystemClaimState } = {}
      ecosystems.forEach((ecosystem) => {
        stateObj[ecosystem] = {
          error: new Error(message),
        }
      })
      setEcosystemsClaimState(stateObj)
      return
    }

    const allPromises = broadcastPromises.map(
      async (broadcastPromise, index) => {
        await Promise.race([
          broadcastPromise,
          new Promise((_, reject) => {
            setTimeout(() => reject(), 10000)
          }),
        ])
          .then((transactionError) => {
            // calculate the total coins claimed
            if (transactionError === null) {
              const eligibility = getEligibility(ecosystems[index])
              if (eligibility?.claimInfo.amount !== undefined)
                totalCoinsClaimed = totalCoinsClaimed.add(
                  eligibility?.claimInfo.amount
                )
            }

            // NOTE: there is an implicit order restriction
            // Transaction Order should be same as Ecosystems array order
            setEcosystemsClaimState((ecosystemState) => ({
              ...ecosystemState,
              [ecosystems[index]]: {
                error:
                  transactionError === null
                    ? null
                    : new Error(
                        'There was an error with the transaction. Please refresh and try again.'
                      ),
              },
            }))
          })
          .catch(() => {
            // NOTE: there is an implicit order restriction
            // Transaction Order should be same as Ecosystems array order
            setEcosystemsClaimState((ecosystemState) => ({
              ...ecosystemState,
              [ecosystems[index]]: {
                error: new Error(
                  'The connection is taking too long to respond. We cannot confirm this claim transaction.'
                ),
              },
            }))
          })
      }
    )

    // wait for all the promises before removing event handler
    await Promise.allSettled(allPromises)
    window.onbeforeunload = null
    // once the transaction has been submitted set the local storage with the path
    setLastStepStatus(
      `/next-steps?totalTokensClaimed=${toStringWithDecimals(
        totalCoinsClaimed
      )}`
    )
  }, [getClaim, tokenDispenser, getEligibility])

  return (
    <>
      {screen == 1 ? (
        <Box>
          <div className="flex items-center justify-between border-b border-light-35  bg-[#242339] py-8 px-10">
            <h4 className="font-header text-[28px] font-light leading-[1.2]">
              Sign Your Wallets and Claim
            </h4>
            <BackButton onBack={onBack} />
          </div>
          <div className="px-10 py-8 text-base16">
            <p className="mb-6">
              Please sign your connected wallets. To sign, click the
              corresponding “sign” button for each wallet. Your wallet will ask
              if you wish to sign the transaction. Confirm by clicking “sign” in
              your wallet’s pop-up window.
            </p>
            <p>Your claimed PYTH tokens will go to this Solana wallet: </p>
            <div className="mt-4 flex justify-between gap-4">
              <SolanaWalletCopyButton />
              <div className="mt-8">
                <ProceedButton onProceed={() => setScreen(2)} />
              </div>
            </div>
          </div>
        </Box>
      ) : screen === 2 ? (
        <SignForEligibleWallets
          onBack={() => setScreen(1)}
          onProceed={() => openModal(true)}
        />
      ) : (
        <ClaimStatus
          onProceed={onProceedWrapper}
          ecosystemsClaimState={ecosystemsClaimState}
        />
      )}
      {modal && (
        <ClaimAirdropModal
          openModal={() => openModal(false)}
          onBack={() => openModal(false)}
          onProceed={async () => {
            openModal(false)
            setScreen(3)
            await submitTxs()
          }}
        />
      )}
    </>
  )
}

function ClaimAirdropModal({
  openModal,
  onBack,
  onProceed,
}: StepProps & { openModal: () => void }) {
  return (
    <Modal openModal={openModal}>
      <h3 className="mb-8  font-header text-[36px] font-light">
        Claim Airdrop
      </h3>
      <p className="mx-auto max-w-[454px] font-body text-base16">
        Please ensure that you have connected all the necessary wallets and the
        Discord account with your claim. Additionally, you can repeat the
        Airdrop Claim process using a different set of wallets.
      </p>
      <div className="mt-12 flex justify-center gap-4">
        <BackButton onBack={onBack} />
        <ProceedButton onProceed={onProceed} />
      </div>
    </Modal>
  )
}
