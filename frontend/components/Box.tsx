import { ReactNode } from 'react'

export function Box({ children }: { children: ReactNode }) {
  return <div className=" border border-light-35 bg-dark">{children}</div>
}
