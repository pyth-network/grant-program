import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { ProviderProps, Ecosystem } from '.'
import { BN } from '@coral-xyz/anchor'
import { ClaimInfo } from 'claim_sdk/claim'
import { useIsClaimAlreadySubmitted } from 'hooks/useIsClaimAlreadySubmitted'

type Eligibility =
  | {
      claimInfo: ClaimInfo
      proofOfInclusion: Uint8Array[]
      isClaimAlreadySubmitted?: boolean
    }
  | undefined

export type EligibilityMap = Record<
  Ecosystem,
  {
    [identity: string]: Eligibility
  }
>

type EligibilityContextType = {
  eligibility: EligibilityMap
  setEligibility: (
    ecosystem: Ecosystem,
    identity: string,
    eligibility: Eligibility
  ) => Promise<void>
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
  Object.keys(obj).forEach((ecosystem) => {
    Object.keys(obj[ecosystem]).forEach((identity) => {
      if (obj[ecosystem][identity] === undefined) return
      const claimInfo = obj[ecosystem][identity].claimInfo
      obj[ecosystem][identity].claimInfo = new ClaimInfo(
        claimInfo.ecosystem,
        claimInfo.identity,
        new BN(claimInfo.amount, 'hex')
      )

      obj[ecosystem][identity].proofOfInclusion = obj[ecosystem][
        identity
      ].proofOfInclusion.map((chunk: any) => Buffer.from(chunk))
    })
  })

  return obj as EligibilityMap
}

function getDefaultEligibilityMap() {
  const map: any = {}
  Object.values(Ecosystem).forEach((key) => (map[key] = {}))
  return map as EligibilityMap
}

export function EligibilityProvider({ children }: ProviderProps) {
  const [eligibility, setEligibility] = useState(
    getStoredEligibilityMap() ?? getDefaultEligibilityMap()
  )

  const isClaimAlreadySubmitted = useIsClaimAlreadySubmitted()

  // side effect: whenever the eligibility map changes sync the local storage
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(ELIGIBILITY_KEY, JSON.stringify(eligibility))
  }, [eligibility])

  const setEligibilityWrapper = useCallback(
    async (
      ecosystem: Ecosystem,
      identity: string,
      eligibility:
        | { claimInfo: ClaimInfo; proofOfInclusion: Uint8Array[] }
        | undefined
    ) => {
      if (eligibility !== undefined) {
        const isSubmitted = await isClaimAlreadySubmitted(eligibility.claimInfo)
        setEligibility((prev) => {
          prev[ecosystem][identity] = {
            ...eligibility,
            isClaimAlreadySubmitted: isSubmitted,
          }

          return { ...prev }
        })
      } else {
        setEligibility((prev) => {
          // note prev[ecosystem] will not be undefined
          prev[ecosystem][identity] = undefined
          return { ...prev }
        })
      }
    },
    [isClaimAlreadySubmitted]
  )

  return (
    <EligibilityContext.Provider
      value={{
        eligibility,
        setEligibility: setEligibilityWrapper,
      }}
    >
      {children}
    </EligibilityContext.Provider>
  )
}

export function useEligibility(): EligibilityContextType {
  const ctx = useContext(EligibilityContext)
  if (ctx === undefined)
    throw new Error('Must be used inside Eligibility Provider')

  return ctx
}
