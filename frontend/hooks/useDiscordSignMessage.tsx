import { Ecosystem } from '@components/Ecosystem'
import { useSignature } from '@components/Ecosystem/SignatureProvider'
import { useCallback, useEffect, useState } from 'react'
import { useGetEcosystemIdentity } from './useGetEcosystemIdentity'
import { useTokenDispenserProvider } from './useTokenDispenserProvider'
import { useSignMessage } from './useSignMessage'
import { useActivity } from '@components/Ecosystem/ActivityProvider'
import { useEligibility } from '@components/Ecosystem/EligibilityProvider'

export function useDiscordSignMessage() {
  const ecosystem = Ecosystem.DISCORD
  const { activity } = useActivity()
  const { getEligibility } = useEligibility()
  const { getSignature, setSignature } = useSignature()
  const getEcosystemIdentity = useGetEcosystemIdentity()
  const signMessageFn = useSignMessage(ecosystem)
  const tokenDispenser = useTokenDispenserProvider()

  const solanaIdentity = getEcosystemIdentity(Ecosystem.SOLANA)
  const ecosystemIdentity = getEcosystemIdentity(ecosystem)
  const message = tokenDispenser?.generateAuthorizationPayload()

  // It wraps the signMessageFn and additionally implement loading and storing
  // Also it checks whether the discord is eligibile or not
  const signMessageWrapper = useCallback(async () => {
    const eligibility = getEligibility(ecosystem)
    if (
      message === undefined ||
      solanaIdentity === undefined ||
      ecosystemIdentity === undefined ||
      !activity[ecosystem] ||
      eligibility === undefined ||
      eligibility.isClaimAlreadySubmitted === true
    )
      return

    // If we already have the signed message, we will not ask the user to sign it again
    if (getSignature(ecosystem) !== undefined) return

    const signedMessage = await signMessageFn(message)
    // Storing the message in the context
    if (signedMessage !== undefined)
      setSignature(solanaIdentity, ecosystem, ecosystemIdentity, signedMessage)
  }, [
    activity,
    ecosystem,
    ecosystemIdentity,
    getEligibility,
    getSignature,
    message,
    setSignature,
    signMessageFn,
    solanaIdentity,
  ])

  useEffect(() => {
    signMessageWrapper()
  }, [signMessageWrapper])
}
