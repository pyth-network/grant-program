import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { Eligibility } from 'utils/api'
import { ProviderProps } from '.'
import { BN } from '@coral-xyz/anchor'
import { ClaimInfo } from 'claim_sdk/claim'

type EligibilityMap = {
  [identity: string]: Eligibility
}
type EligibilityContextType = {
  eligibility: EligibilityMap
  setEligibility: (identity: string, eligibility: Eligibility) => void
}
const EligibilityContext = createContext<EligibilityContextType | undefined>(
  undefined
)

const ELIGIBILITY_KEY = 'eligibility-key'
function getStoredEligibilityMap(): EligibilityMap | null {
  if (typeof window === 'undefined') return null

  const mapStr = localStorage.getItem(ELIGIBILITY_KEY)
  if (mapStr === null) return null

  const obj = JSON.parse(mapStr)

  // Every other key value pair is fine, except for ClaimInfo.
  // We need to do some customized parsing as it is a class.
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined) return
    obj[key].claimInfo.amount = new BN(obj[key].claimInfo.amount, 'hex')
    obj[key].claimInfo = Object.setPrototypeOf(obj[key].claimInfo, ClaimInfo)
  })

  return obj as EligibilityMap
}

export function EligibilityProvider({ children }: ProviderProps) {
  const [eligibility, setEligibility] = useState(
    getStoredEligibilityMap() ?? {}
  )

  // side effect: whenever the eligibility map changes sync the local storage
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(ELIGIBILITY_KEY, JSON.stringify(eligibility))
  }, [eligibility])

  const setEligibilityWrapper = useCallback(
    (identity: string, eligibility: Eligibility) => {
      setEligibility((prev) => ({ ...prev, [identity]: eligibility }))
    },
    []
  )

  return (
    <EligibilityContext.Provider
      value={{ eligibility, setEligibility: setEligibilityWrapper }}
    >
      {children}
    </EligibilityContext.Provider>
  )
}

export function useEligiblity(): EligibilityContextType {
  const ctx = useContext(EligibilityContext)
  if (ctx === undefined)
    throw new Error('Must be used inside Eligibility Provider')

  return ctx
}