import { SignMessageFn } from 'hooks/useSignMessage'
import { useState, useCallback } from 'react'
import Signed from '../../images/signed.inline.svg'
import { classNames } from 'utils/classNames'
import { useSignature } from '@components/Ecosystem/SignatureProvider'

export type SignButtonProps =
  | {
      signMessageFn: SignMessageFn
      message: string
      solanaIdentity: string
      ecosystemIdentity: string
      disable?: false
    }
  | {
      signMessageFn?: SignMessageFn
      message?: string
      solanaIdentity?: string
      ecosystemIdentity?: string
      disable: true
    }

export function SignButton({
  signMessageFn,
  message,
  solanaIdentity,
  ecosystemIdentity,
  disable,
}: SignButtonProps) {
  const { signatureMap, setSignature } = useSignature()
  const [isSigning, setIsSigning] = useState(false)

  // It wraps the signMessageFn and additionally implement loading and storing
  const signMessageWrapper = useCallback(async () => {
    if (disable === true) return

    // If we already have the signed message, we will not ask the user to sign it again
    if (
      signatureMap[solanaIdentity] !== undefined &&
      signatureMap[solanaIdentity][ecosystemIdentity] !== undefined
    )
      return
    setIsSigning(true)
    const signedMessage = await signMessageFn(message)
    // Storing the message in the context
    if (signedMessage !== undefined)
      setSignature(solanaIdentity, ecosystemIdentity, signedMessage)

    setIsSigning(false)
  }, [
    disable,
    ecosystemIdentity,
    message,
    setSignature,
    signMessageFn,
    signatureMap,
    solanaIdentity,
  ])

  const isSigned =
    !disable &&
    signatureMap[solanaIdentity] !== undefined &&
    signatureMap[solanaIdentity][ecosystemIdentity] !== undefined

  return (
    <button
      className={classNames(
        'btn before:btn-bg btn--dark  before:bg-dark hover:text-dark hover:before:bg-light disabled:text-light disabled:before:bg-dark'
      )}
      onClick={signMessageWrapper}
      disabled={disable || isSigned}
    >
      <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
        <span className="flex items-center gap-3">
          {isSigned ? (
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
