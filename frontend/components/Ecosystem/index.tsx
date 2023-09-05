import { ReactNode } from 'react'
import { ActivityProvider } from './ActivityProvider'
import { EligibilityProvider } from './EligibilityProvider'
import { SignatureProvider } from './SignatureProvider'

export type ProviderProps = {
  children: ReactNode
}
export function EcosystemProviders({ children }: ProviderProps) {
  return (
    <ActivityProvider>
      <EligibilityProvider>
        <SignatureProvider>{children}</SignatureProvider>
      </EligibilityProvider>
    </ActivityProvider>
  )
}
