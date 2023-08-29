import React, { useCallback } from 'react'

import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react'
import { SignButton } from './wallets/SignButton'
import { ECOSYSTEM } from './EcosystemProvider'
import { fetchDiscordSignedMessage } from 'utils/api'

// This component assumes that the user is already sign in.
// Though it won't throw any error even if the user is not.
// It will simply set the signedMessage to undefined
export function DiscordSignButton() {
  const { publicKey } = useSolanaWallet()

  const signMessageFn = useCallback(async () => {
    if (publicKey === null) return
    return await fetchDiscordSignedMessage(publicKey)
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
