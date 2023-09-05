import { ReactNode } from 'react'
import { ActivityProvider } from './ActivityProvider'
import { EligibilityProvider } from './EligibilityProvider'

export type ProviderProps = {
  children: ReactNode
}
export function EcosystemProviders({ children }: ProviderProps) {
  return (
    <ActivityProvider>
      <EligibilityProvider>{children}</EligibilityProvider>
    </ActivityProvider>
  )
}
