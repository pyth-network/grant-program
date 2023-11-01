import { Ecosystem } from '@components/Ecosystem'
import { useSignature } from '@components/Ecosystem/SignatureProvider'
import Signed from '@images/signed.inline.svg'
import { useGetEcosystemIdentity } from 'hooks/useGetEcosystemIdentity'
import { useSignMessage } from 'hooks/useSignMessage'
import { useTokenDispenserProvider } from 'hooks/useTokenDispenserProvider'
import { useCallback, useState } from 'react'
import { classNames } from 'utils/classNames'

export type EcosystemSignButtonProps = {
  ecosystem: Ecosystem
}

// EcosystemSignButton will be disabled, if any of the message, solanaIdentity, or ecosystemIdentity
// is undefined
export function EcosystemSignButton({
  ecosystem,
}: EcosystemSignButtonProps): JSX.Element {
  const { getSignature, setSignature } = useSignature()
  const [isSigning, setIsSigning] = useState(false)
  const getEcosystemIdentity = useGetEcosystemIdentity()
  const signMessageFn = useSignMessage(ecosystem)
  const tokenDispenser = useTokenDispenserProvider()

  const solanaIdentity = getEcosystemIdentity(Ecosystem.SOLANA)
  const ecosystemIdentity = getEcosystemIdentity(ecosystem)
  const message = tokenDispenser?.generateAuthorizationPayload()

  // It wraps the signMessageFn and additionally implement loading and storing
  const signMessageWrapper = useCallback(async () => {
    if (
      message === undefined ||
      solanaIdentity === undefined ||
      ecosystemIdentity === undefined
    )
      return

    // If we already have the signed message, we will not ask the user to sign it again
    if (getSignature(ecosystem) !== undefined) return
    setIsSigning(true)
    const signedMessage = await signMessageFn(message)
    // Storing the message in the context
    if (signedMessage !== undefined)
      setSignature(solanaIdentity, ecosystem, ecosystemIdentity, signedMessage)

    setIsSigning(false)
  }, [
    ecosystem,
    ecosystemIdentity,
    getSignature,
    message,
    setSignature,
    signMessageFn,
    solanaIdentity,
  ])

  const isDisabled =
    message === undefined ||
    solanaIdentity === undefined ||
    ecosystemIdentity === undefined

  const isSigned = !isDisabled && getSignature(ecosystem) !== undefined

  return (
    <button
      className={classNames(
        'btn before:btn-bg btn--dark  before:bg-dark hover:text-dark hover:before:bg-light disabled:text-light disabled:before:bg-dark'
      )}
      onClick={signMessageWrapper}
      disabled={isDisabled || isSigned}
    >
      <span className="relative inline-flex items-center gap-1 whitespace-nowrap  sm:gap-2.5">
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
