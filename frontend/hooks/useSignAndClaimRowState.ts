import { Ecosystem } from '@components/Ecosystem'
import { useActivity } from '@components/Ecosystem/ActivityProvider'
import { useEligibility } from '@components/Ecosystem/EligibilityProvider'
import { useMemo } from 'react'

type RowStateRet = {
  disabled: boolean
  tooltipContent?: string
}

export function useSignAndClaimRowState(ecosystem: Ecosystem): RowStateRet {
  const { activity } = useActivity()
  const { getEligibility } = useEligibility()

  return useMemo(() => {
    // Row is disabled when
    // - Ecosystem is inactive or
    // - Ecosystem is active but
    // - - No Claim Info found or
    // - - Claim already submitted

    // Rows is enabled if
    // - Ecosystem is active and
    // - Ecosystem has a claim info and
    // - Claim has not been submitted

    const isActive = activity[ecosystem]
    // (NOTE: ecosystem will have a claim info only if the connected identity has a claim info)
    const eligibility = getEligibility(ecosystem)
    if (isActive === true) {
      if (eligibility?.claimInfo !== undefined) {
        if (eligibility?.isClaimAlreadySubmitted) {
          return {
            disabled: true,
            tooltipContent:
              'The tokens for this ecosystem has already been claimed.',
          }
        } else {
          return {
            disabled: false,
          }
        }
      } else {
        return {
          disabled: true,
          tooltipContent: 'There are no tokens to claim for this ecosystem.',
        }
      }
    } else
      return {
        disabled: true,
      }
  }, [activity, ecosystem, getEligibility])
}
