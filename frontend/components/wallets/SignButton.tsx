import { SignMessageFn } from 'hooks/useSignMessage'
import { useState, useCallback } from 'react'
import Signed from '@images/signed.inline.svg'
import { classNames } from 'utils/classNames'
import { useSignature } from '@components/Ecosystem/SignatureProvider'
import { Ecosystem } from '@components/Ecosystem'

export type SignButtonProps = {
  signMessageFn: SignMessageFn
  ecosystem: Ecosystem
  message?: string
  solanaIdentity?: string
  ecosystemIdentity?: string
}

// SignButton will be disabled, if any of the message, solanaIdentity, or ecosystemIdentity
// is undefined
export function SignButton({
  signMessageFn,
  message,
  solanaIdentity,
  ecosystemIdentity,
  ecosystem,
}: SignButtonProps): JSX.Element {
  const { signatureMap, setSignature } = useSignature()
  const [isSigning, setIsSigning] = useState(false)

  // It wraps the signMessageFn and additionally implement loading and storing
  const signMessageWrapper = useCallback(async () => {
    if (
      message === undefined ||
      solanaIdentity === undefined ||
      ecosystemIdentity === undefined
    )
      return

    // If we already have the signed message, we will not ask the user to sign it again
    if (
      signatureMap[solanaIdentity]?.[ecosystem]?.[ecosystemIdentity] !==
      undefined
    )
      return
    setIsSigning(true)
    const signedMessage = await signMessageFn(message)
    // Storing the message in the context
    if (signedMessage !== undefined)
      setSignature(solanaIdentity, ecosystem, ecosystemIdentity, signedMessage)

    setIsSigning(false)
  }, [
    ecosystem,
    ecosystemIdentity,
    message,
    setSignature,
    signMessageFn,
    signatureMap,
    solanaIdentity,
  ])

  const isDisabled =
    message === undefined ||
    solanaIdentity === undefined ||
    ecosystemIdentity === undefined

  const isSigned =
    !isDisabled &&
    signatureMap[solanaIdentity]?.[ecosystem]?.[ecosystemIdentity] !== undefined

  return (
    <button
      className={classNames(
        'btn before:btn-bg btn--dark  before:bg-dark hover:text-dark hover:before:bg-light disabled:text-light disabled:before:bg-dark'
      )}
      onClick={signMessageWrapper}
      disabled={isDisabled || isSigned}
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
