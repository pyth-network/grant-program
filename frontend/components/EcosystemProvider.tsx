import { SignedMessage } from 'claim_sdk/ecosystems/signatures'
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { Eligibility } from 'utils/api'

export enum Ecosystem {
  SOLANA = 'Solana',
  EVM = 'Evm',
  APTOS = 'Aptos',
  SUI = 'Sui',
  INJECTIVE = 'Injective',
  OSMOSIS = 'Osmosis',
  NEUTRON = 'Neutron',
  DISCORD = 'Pyth Discord',
}

export type EcosystemMap = Record<
  Ecosystem,
  {
    // True, if the user is active in this ecosystem.
    isActive: boolean
    // Once the user has signed a message, we will globally store it here.
    signedMessage?: SignedMessage
    // Undefined, if the ecosystem is not eligible or value is not set
    eligibility: Eligibility
  }
>

export type EcosystemContextType = {
  // The state of all the ecosystems
  map: EcosystemMap
  // Set the isActive property of the given ecosystem
  setActive: (ecosystem: Ecosystem, isActive: boolean) => void
  // Set the eligibility fetch using the API
  setEligibility: (ecosystem: Ecosystem, eligibility: Eligibility) => void
  // set the signed message for the ecosystem
  setSignedMessage: (
    ecosystem: Ecosystem,
    signedMessage: SignedMessage | undefined
  ) => void
}
export const EcosystemContext = createContext<EcosystemContextType | undefined>(
  undefined
)

// The default value for ecosystem
const ecosystemMap = Object.values(Ecosystem).reduce((map, currentValue) => {
  map[currentValue] = { isActive: false, eligibility: undefined }
  return map
}, {} as EcosystemMap)

export function EcosystemProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState(ecosystemMap)
  const setActive = useCallback((ecosytem: Ecosystem, isActive: boolean) => {
    setMap((prevMap) => {
      const newMap = { ...prevMap }
      newMap[ecosytem].isActive = isActive
      return newMap
    })
  }, [])

  const setEligibility = useCallback(
    (ecosytem: Ecosystem, eligibility: Eligibility) => {
      setMap((prevMap) => {
        const newMap = { ...prevMap }
        newMap[ecosytem].eligibility = eligibility
        return newMap
      })
    },
    []
  )

  const setSignedMessage = useCallback(
    (ecosytem: Ecosystem, signedMessage: SignedMessage | undefined) => {
      setMap((prevMap) => {
        const newMap = { ...prevMap }
        newMap[ecosytem].signedMessage = signedMessage
        return newMap
      })
    },
    []
  )

  const contextValue = useMemo(
    () => ({ map, setActive, setEligibility, setSignedMessage }),
    [map, setActive, setEligibility, setSignedMessage]
  )

  return (
    <EcosystemContext.Provider value={contextValue}>
      {children}
    </EcosystemContext.Provider>
  )
}

export function useEcosystem() {
  const ctx = useContext(EcosystemContext)!
  if (ctx === undefined)
    throw new Error(
      'This hook should only be used when one of its ancestor is EcosystemProvider.'
    )
  return ctx
}
