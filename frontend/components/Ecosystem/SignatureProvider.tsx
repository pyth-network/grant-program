import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { ProviderProps } from '.'
import { SignedMessage } from 'claim_sdk/ecosystems/signatures'

type SignatureMap = {
  [solanaIdentity: string]: {
    [ecosystemIdentity: string]: SignedMessage
  }
}
type SignatureContextType = {
  signatureMap: SignatureMap
  setSignature: (
    solanaIdentity: string,
    ecosystemIdentity: string,
    signedMsg: SignedMessage
  ) => void
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
  return obj as SignatureMap
}

export function SignatureProvider({ children }: ProviderProps) {
  const [signatureMap, setSignatureMap] = useState(
    getStoredSignatureMap() ?? {}
  )

  console.log(signatureMap)

  // side effect: whenever the eligibility map changes sync the local storage
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(SIGNATURE_KEY, JSON.stringify(signatureMap))
  }, [signatureMap])

  const setSignatureMapWrapper = useCallback(
    (
      solanaIdentity: string,
      ecosystemIdentity: string,
      signedMsg: SignedMessage
    ) => {
      setSignatureMap((prev) => {
        if (prev[solanaIdentity] === undefined) prev[solanaIdentity] = {}
        prev[solanaIdentity][ecosystemIdentity] = signedMsg
        return { ...prev }
      })
    },
    []
  )

  return (
    <SignatureContext.Provider
      value={{ signatureMap, setSignature: setSignatureMapWrapper }}
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
