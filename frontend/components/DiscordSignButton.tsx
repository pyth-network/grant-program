import React, { useCallback } from 'react'

import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { SignedMessage } from 'claim_sdk/ecosystems/signatures'
import { SignButton } from './wallets/SignButton'
import { ECOSYSTEM } from './EcosystemProvider'

// This component assumes that the user is already sign in.
// Though it won't throw any error even if the user is not.
// It will simply set the signedMessage to undefined
export function DiscordSignButton() {
  const { publicKey } = useSolanaWallet()

  const signMessageFn = useCallback(async () => {
    if (publicKey === null) return

    try {
      const msg = await fetch(
        `/api/grant/v1/discord_signed_message?publicKey=${publicKey.toString()}`
      )
      const signedMessage: SignedMessage = await msg.json()
      return signedMessage
    } catch {
      return undefined
    }
  }, [publicKey])

  // TODO: change message
  return (
    <SignButton
      signMessageFn={signMessageFn}
      ecosystem={ECOSYSTEM.DISCORD}
      message={'change this message'}
    />
  )
}
