import React, { useCallback } from 'react'

import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { SignButton } from './wallets/SignButton'
import { Ecosystem } from './EcosystemProvider'
import { fetchDiscordSignedMessage } from 'utils/api'
import { useSession } from 'next-auth/react'
import { useTokenDispenserProvider } from './TokenDispenserProvider'

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
  if (
    data?.user?.name === undefined ||
    data?.user?.name === null ||
    tokenDispenser === undefined
  )
    return <SignButton disable />
  else
    return (
      <SignButton
        signMessageFn={signMessageFn}
        message={tokenDispenser.generateAuthorizationPayload()}
        solanaIdentity={tokenDispenser.claimant.toBase58()}
        ecosystemIdentity={data?.user?.name}
      />
    )
}
