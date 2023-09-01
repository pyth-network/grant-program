import { BN } from 'bn.js'
import { ClaimInfo } from 'claim_sdk/claim'
import { SignedMessage } from 'claim_sdk/ecosystems/signatures'
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
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

const ECOSYSTEM_MAP_STORAGE_KEY = 'ecosystem-map-local-storage-key'

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
  // Storing this map locally
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
  // delete all the signed message by setting them to undefined
  setAllSignedMessageUndefined: () => void
}
export const EcosystemContext = createContext<EcosystemContextType | undefined>(
  undefined
)

// The default value for ecosystem
const ecosystemMap = Object.values(Ecosystem).reduce((map, currentValue) => {
  map[currentValue] = { isActive: false, eligibility: undefined }
  return map
}, {} as EcosystemMap)

function getStoredEcosystemMap(): EcosystemMap | null {
  if (typeof window === 'undefined') return null

  const mapStr = localStorage.getItem(ECOSYSTEM_MAP_STORAGE_KEY)
  if (mapStr === null) return null

  const obj = JSON.parse(mapStr)

  // Every other key value pair is fine, except for ClainInfo.
  // We need to do some customized parsing as it is a class.
  Object.keys(obj).forEach((key) => {
    if (obj[key].eligibility === undefined) return
    obj[key].eligibility.claimInfo.amount = new BN(
      obj[key].eligibility.claimInfo.amount,
      'hex'
    )
    obj[key].eligibility.claimInfo = Object.setPrototypeOf(
      obj[key].eligibility.claimInfo,
      ClaimInfo
    )
  })

  return obj as EcosystemMap
}

export function EcosystemProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState(getStoredEcosystemMap() ?? ecosystemMap)

  // side effect update local storage if map is updated
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(ECOSYSTEM_MAP_STORAGE_KEY, JSON.stringify(map))
  }, [map])
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

  const setAllSignedMessageUndefined = useCallback(() => {
    setMap((prevMap) => {
      const newMap = { ...prevMap }
      Object.values(Ecosystem).forEach(
        (k) => newMap[k as Ecosystem].signedMessage === undefined
      )
      return newMap
    })
  }, [])

  const contextValue = useMemo(
    () => ({
      map,
      setActive,
      setEligibility,
      setSignedMessage,
      setAllSignedMessageUndefined,
    }),
    [
      map,
      setActive,
      setEligibility,
      setSignedMessage,
      setAllSignedMessageUndefined,
    ]
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
