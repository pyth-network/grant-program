import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { Ecosystem, ProviderProps } from '.'
import { SignedMessage } from 'claim_sdk/ecosystems/signatures'
import { useGetEcosystemIdentity } from 'hooks/useGetEcosystemIdentity'
import { useActivity } from './ActivityProvider'

type SignatureMap = {
  [solanaIdentity: string]: {
    [ecosystem in Ecosystem]?: {
      [ecosystemIdentity: string]: SignedMessage
    }
  }
}
type SignatureContextType = {
  setSignature: (
    solanaIdentity: string,
    ecosystem: Ecosystem,
    ecosystemIdentity: string,
    signedMsg: SignedMessage
  ) => void
  getSignature: (ecosystem: Ecosystem) => SignedMessage | undefined
}
const SignatureContext = createContext<SignatureContextType | undefined>(
  undefined
)

const SIGNATURE_KEY = 'signature-key'
function getStoredSignatureMap(): SignatureMap | null {
  if (typeof window === 'undefined') return null

  const mapStr = localStorage.getItem(SIGNATURE_KEY)
  if (mapStr === null) return null

  const obj = JSON.parse(mapStr)
  Object.keys(obj).forEach((solanaIdentity) => {
    Object.keys(obj[solanaIdentity]).forEach((ecosystem) => {
      Object.keys(obj[solanaIdentity][ecosystem]).forEach(
        (ecosystemIdentity) => {
          const signedMsg = obj[solanaIdentity][ecosystem][ecosystemIdentity]
          obj[solanaIdentity][ecosystem][ecosystemIdentity] = {
            // parsing the stringified buffer here
            publicKey: Buffer.from(signedMsg.publicKey),
            signature: Buffer.from(signedMsg.signature),
            recoveryId: signedMsg.recoveryId,
            fullMessage: Buffer.from(signedMsg.fullMessage),
          }
        }
      )
    })
  })
  return obj as SignatureMap
}

export function SignatureProvider({ children }: ProviderProps) {
  const [signatureMap, setSignatureMap] = useState(
    getStoredSignatureMap() ?? {}
  )

  // side effect: whenever the signature map changes sync the local storage
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(SIGNATURE_KEY, JSON.stringify(signatureMap))
  }, [signatureMap])

  const setSignatureMapWrapper = useCallback(
    (
      solanaIdentity: string,
      ecosystem: Ecosystem,
      ecosystemIdentity: string,
      signedMsg: SignedMessage
    ) => {
      setSignatureMap((prev) => {
        if (prev[solanaIdentity] === undefined) prev[solanaIdentity] = {}
        if (prev[solanaIdentity][ecosystem] === undefined)
          prev[solanaIdentity][ecosystem] = {}

        prev[solanaIdentity][ecosystem]![ecosystemIdentity] = {
          // signed msgs fields are sometimes a buffer and sometimes a uint8array
          // JSON stringify these fields differently
          // And it is more complex to parse the stringified uint8array than a buffer
          publicKey: Buffer.from(signedMsg.publicKey),
          signature: Buffer.from(signedMsg.signature),
          recoveryId: signedMsg.recoveryId,
          fullMessage: Buffer.from(signedMsg.fullMessage),
        }
        return { ...prev }
      })
    },
    []
  )

  const { getActivity } = useActivity()
  const getEcosystemIdentity = useGetEcosystemIdentity()
  // It returns the signature for the currently connected solana wallet
  // and current ecosystem auth connection if it is active
  const getSignature = useCallback(
    (ecosystem: Ecosystem) => {
      if (getActivity(ecosystem) === false) return undefined
      const solanaIdentity = getEcosystemIdentity(Ecosystem.SOLANA)
      const ecosystemIdentity = getEcosystemIdentity(ecosystem)

      if (solanaIdentity === undefined || ecosystemIdentity === undefined)
        return undefined
      return signatureMap[solanaIdentity]?.[ecosystem]?.[ecosystemIdentity]
    },
    [getActivity, getEcosystemIdentity, signatureMap]
  )

  return (
    <SignatureContext.Provider
      value={{
        setSignature: setSignatureMapWrapper,
        getSignature,
      }}
    >
      {children}
    </SignatureContext.Provider>
  )
}

export function useSignature(): SignatureContextType {
  const ctx = useContext(SignatureContext)
  if (ctx === undefined)
    throw new Error('Must be used inside Signature Provider')

  return ctx
}
