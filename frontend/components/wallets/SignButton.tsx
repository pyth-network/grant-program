import { ECOSYSTEM, useEcosystem } from '@components/EcosystemProvider'
import { SignMessageFn } from 'hooks/useSignMessage'
import { useState, useCallback } from 'react'
import Signed from '../../images/signed.inline.svg'

export type SignButtonProps = {
  signMessageFn: SignMessageFn
  ecosystem: ECOSYSTEM
  message: string
}

export function SignButton({
  signMessageFn,
  ecosystem,
  message,
}: SignButtonProps) {
  const { setSignedMessage, map: ecosystemMap } = useEcosystem()

  const [isSigning, setIsSigning] = useState(false)

  // It wraps the signMessageFn and additionally implement loading and storing
  const signMessageWrapper = useCallback(async () => {
    // If we already have the signed message, we will not ask the user to sign it again
    if (ecosystemMap[ecosystem].signedMessage !== undefined) return
    setIsSigning(true)
    const signedMessage = await signMessageFn(message)
    // Storing the message in the context
    setSignedMessage(ecosystem, signedMessage)
    setIsSigning(false)
  }, [ecosystem, ecosystemMap, message, setSignedMessage, signMessageFn])

  return (
    <button
      className="btn before:btn-bg btn--dark  before:bg-dark hover:text-dark hover:before:bg-light"
      onClick={signMessageWrapper}
    >
      <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
        <span className="flex items-center gap-3">
          {ecosystemMap.Solana.signedMessage !== undefined ? (
            <>
              Signed <Signed />{' '}
            </>
          ) : isSigning ? (
            'Signing'
          ) : (
            'Sign'
          )}
        </span>
      </span>
    </button>
  )
}
