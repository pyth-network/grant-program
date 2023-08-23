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

export enum ECOSYSTEM {
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
  ECOSYSTEM,
  {
    // True, if the user is active in this ecosystem.
    isActive: boolean
    // Once the user has signed a message, we will globally store it here.
    signedMessage?: SignedMessage
    // Undefined, if the ecosystem is not eligibile or value is not set
    eligibility: Eligibility
  }
>

export type EcosystemContextType = {
  // The state of all the ecosystems
  map: EcosystemMap
  // Set the isActive property of the given ecosystem
  setActive: (ecosystem: ECOSYSTEM, isActive: boolean) => void
  // Set the eligibility fetch using the API
  setEligibility: (ecosystem: ECOSYSTEM, eligibility: Eligibility) => void
  // TODO: add other methods setSignedMessage
}
export const EcosystemContext = createContext<EcosystemContextType | undefined>(
  undefined
)

// The default value for ecosystem
const ecosystemMap = Object.values(ECOSYSTEM).reduce((map, currentValue) => {
  map[currentValue] = { isActive: false, eligibility: undefined }
  return map
}, {} as EcosystemMap)

export function EcosystemProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState(ecosystemMap)
  const setActive = useCallback((ecosytem: ECOSYSTEM, isActive: boolean) => {
    setMap((prevMap) => {
      const newMap = { ...prevMap }
      newMap[ecosytem].isActive = isActive
      return newMap
    })
  }, [])

  const setEligibility = useCallback(
    (ecosytem: ECOSYSTEM, eligibility: Eligibility) => {
      setMap((prevMap) => {
        const newMap = { ...prevMap }
        newMap[ecosytem].eligibility = eligibility
        return newMap
      })
    },
    []
  )

  const contextValue = useMemo(
    () => ({ map, setActive, setEligibility }),
    [map, setActive, setEligibility]
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
