import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { ProviderProps, Ecosystem } from '.'
import { ClaimInfo } from 'claim_sdk/claim'
import { useActivity } from './ActivityProvider'
import { useGetEcosystemIdentity } from 'hooks/useGetEcosystemIdentity'
import { fetchAmountAndProof } from 'utils/api'
import { enumToSdkEcosystem } from 'utils/ecosystemEnumToEcosystem'
import { isClaimAlreadySubmitted } from 'utils/isClaimAlreadySubmitted'
import { EligibilityStore } from 'utils/store'

type Eligibility =
  | {
      claimInfo: ClaimInfo
      proofOfInclusion: Uint8Array[]
      isClaimAlreadySubmitted?: boolean
    }
  | undefined

export type EligibilityMap = {
  [ecosystem in Ecosystem]?: {
    [ecosystemIdentity: string]: Eligibility
  }
}

type EligibilityContextType = {
  getEligibility: (ecosystem: Ecosystem) => Eligibility
}
const EligibilityContext = createContext<EligibilityContextType | undefined>(
  undefined
)

export function EligibilityProvider({ children }: ProviderProps) {
  const [eligibilityMap, setEligibilityMap] = useState(
    EligibilityStore.get() ?? {}
  )

  const getEcosystemIdentity = useGetEcosystemIdentity()

  // side effect: whenever the eligibilityMap changes sync the local storage
  useEffect(() => {
    EligibilityStore.set(eligibilityMap)
  }, [eligibilityMap])

  // Whenever any ecosystem identity changes
  // Fetch its eligibility, and store it
  useEffect(() => {
    ;(async () => {
      // using changes array to make only one call to setState
      let changes: [Ecosystem, string, Eligibility][] = []
      await Promise.all(
        Object.values(Ecosystem).map(async (ecosystem) => {
          const identity = getEcosystemIdentity(ecosystem)
          // If there is no current connection or if the eligibility was set previously
          // don't do anything
          // NOTE: we need to check if identity was previously stored
          // We can't check it using eligibilityMap[ecosystem][identity] === undefined
          // As, an undefined eligibility can be stored before.
          // Hence, we are checking if the key exists in the object
          if (identity === undefined) return
          if (
            eligibilityMap[ecosystem] !== undefined &&
            identity in eligibilityMap[ecosystem]!
          )
            return

          // No eligibility was stored before
          let fetchedEligibility = await fetchAmountAndProof(
            enumToSdkEcosystem(ecosystem),
            identity
          )
          // Even if the fetchedEligibility was undefined
          // We are still updating the eligibilityMap to add the key to the object
          changes.push([ecosystem, identity, fetchedEligibility])
        })
      )

      if (changes.length !== 0) {
        setEligibilityMap((prev) => {
          changes.forEach(([ecosystem, identity, eligibility]) => {
            if (prev[ecosystem] === undefined) prev[ecosystem] = {}
            prev[ecosystem]![identity] = eligibility
          })

          return { ...prev }
        })
      }
    })()
  }, [eligibilityMap, getEcosystemIdentity])

  // Fetch the latest claim status of ecosystem
  useEffect(() => {
    ;(async () => {
      // We are using changes array to make the setState call only once
      let changes: [Ecosystem, string, boolean][] = []
      await Promise.all(
        Object.values(Ecosystem).map(async (ecosystem) => {
          {
            const identity = getEcosystemIdentity(ecosystem)
            // If there is no current connection
            if (identity === undefined) return
            if (eligibilityMap[ecosystem] === undefined) return

            if (identity in eligibilityMap[ecosystem]!) {
              if (eligibilityMap[ecosystem]![identity] === undefined) return
              const prevSubmittedStatus =
                eligibilityMap[ecosystem]![identity]!.isClaimAlreadySubmitted
              const newSubmittedStatus = await isClaimAlreadySubmitted(
                eligibilityMap[ecosystem]![identity]!.claimInfo
              )

              if (prevSubmittedStatus !== newSubmittedStatus) {
                changes.push([ecosystem, identity, newSubmittedStatus])
              }
            }
          }
        })
      )

      if (changes.length !== 0) {
        setEligibilityMap((prev) => {
          for (let [ecosystem, identity, isSubmitted] of changes) {
            prev[ecosystem]![identity] = {
              // store ecosystem, identity in array maybe
              ...prev[ecosystem]![identity]!,
              isClaimAlreadySubmitted: isSubmitted,
            }
          }
          return { ...prev }
        })
      }
    })()
  }, [eligibilityMap, getEcosystemIdentity])

  const { activity } = useActivity()
  // `getEligibility` will return the eligibility for the given ecosystem.
  // If the ecosystem is not active or there is no auth connection, it will
  // return undefined. Else whatever the value was stored for the current connection
  const getEligibility = useCallback(
    (ecosystem: Ecosystem): Eligibility => {
      if (!activity[ecosystem]) return undefined
      else {
        const identity = getEcosystemIdentity(ecosystem)
        if (identity === undefined) return undefined
        else return eligibilityMap[ecosystem]?.[identity]
      }
    },
    [activity, eligibilityMap, getEcosystemIdentity]
  )

  return (
    <EligibilityContext.Provider
      value={{
        getEligibility: getEligibility,
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
