import { ReactNode } from 'react'

export function Box({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-fit overflow-auto border border-light-35 bg-dark">
      {children}
    </div>
  )
}
