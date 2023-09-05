import { ReactNode } from 'react'
import { ActivityProvider } from './ActivityProvider'

export type ProviderProps = {
  children: ReactNode
}
export function EcosystemProviders({ children }: ProviderProps) {
  return <ActivityProvider>{children}</ActivityProvider>
}
