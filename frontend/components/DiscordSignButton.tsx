import React, { useCallback } from 'react'
import { SignButton } from './wallets/SignButton'
import { fetchDiscordSignedMessage } from 'utils/api'
import { useSession } from 'next-auth/react'
import { useTokenDispenserProvider } from './TokenDispenserProvider'
import { Ecosystem } from './Ecosystem'

// This component assumes that the user is already sign in.
// Though it won't throw any error even if the user is not.
// It will simply set the signedMessage to undefined
export function DiscordSignButton() {
  const tokenDispenser = useTokenDispenserProvider()

  const signMessageFn = useCallback(async () => {
    if (tokenDispenser?.claimant === undefined) return
    return await fetchDiscordSignedMessage(tokenDispenser.claimant)
  }, [tokenDispenser?.claimant])

  const { data } = useSession()

  return (
    <SignButton
      signMessageFn={signMessageFn}
      message={tokenDispenser?.generateAuthorizationPayload()}
      solanaIdentity={tokenDispenser?.claimant.toBase58()}
      ecosystem={Ecosystem.DISCORD}
      ecosystemIdentity={
        data?.user?.name === null ? undefined : data?.user?.name
      }
    />
  )
}
