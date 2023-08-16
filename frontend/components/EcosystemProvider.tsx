import { SignedMessage } from 'claim_sdk/ecosystems/signatures'
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

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
    // True, if the user's account in this ecosystem is eligible for tokens.
    isEligible: boolean
    // Number of pyth tokens the user's account is eligible for.
    eligibleAmount?: number
    // Once the user has signed a message, we will globally store it here.
    signedMessage?: SignedMessage
  }
>

export type ContextType = {
  map: EcosystemMap
  setActive: (ecosystem: ECOSYSTEM, isActive: boolean) => void
}
export const EcosystemContext = createContext<ContextType | undefined>(
  undefined
)
const ecosystemMap = Object.values(ECOSYSTEM).reduce((map, currentValue) => {
  map[currentValue] = { isActive: false, isEligible: false }
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

  const contextValue = useMemo(() => ({ map, setActive }), [map, setActive])

  return (
    <EcosystemContext.Provider value={contextValue}>
      {children}
    </EcosystemContext.Provider>
  )
}

export function useEcosystem() {
  return useContext(EcosystemContext)!
}
