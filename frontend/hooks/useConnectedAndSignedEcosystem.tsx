import { Ecosystem } from '@components/Ecosystem'
import { useCallback, useMemo } from 'react'
import { useSignature } from '@components/Ecosystem/SignatureProvider'
import { useGetEcosystemIdentity } from './useGetEcosystemIdentity'

// get the ecosystems which are connected currently
// and whose msgs have been signed
export function useConnectedAndSignedEcosystem(): Ecosystem[] {
  // fetch identity to know connection state
  const getEcosystemIdentity = useGetEcosystemIdentity()

  const { signatureMap } = useSignature()

  const isEcosytemConnAndSigned = useCallback(
    (ecosystem: Ecosystem) => {
      // if solana address is undefined we can't read any stored signed messages
      const solanaIdentity = getEcosystemIdentity(Ecosystem.SOLANA)
      if (solanaIdentity === undefined) return false

      const ecosystemIdentity = getEcosystemIdentity(ecosystem)
      if (ecosystemIdentity === undefined) return false
      else {
        const signatures = signatureMap[solanaIdentity]
        const signature = signatures[ecosystem]?.[ecosystemIdentity]
        if (signature !== undefined) return true
      }
    },
    [getEcosystemIdentity, signatureMap]
  )

  return useMemo(() => {
    const ecosystemArr: Ecosystem[] = []

    Object.values(Ecosystem).forEach((ecosystem) => {
      if (isEcosytemConnAndSigned(ecosystem)) ecosystemArr.push(ecosystem)
    })

    return ecosystemArr
  }, [isEcosytemConnAndSigned])
}
