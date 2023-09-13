import { ReactNode } from 'react'

export type ButtonProps = {
  onClick: () => void
  type: 'primary' | 'secondary'
  disabled?: boolean
  children: ReactNode
}

export function Button({ onClick, type, disabled, children }: ButtonProps) {
  const className =
    type === 'primary'
      ? 'btn before:btn-bg  btn--light before:bg-light hover:text-light hover:before:bg-dark disabled:text-dark disabled:before:bg-light disabled:opacity-75 disabled:cursor-not-allowed'
      : 'btn before:btn-bg  btn--dark before:bg-dark hover:text-dark hover:before:bg-light disabled:text-light disabled:before:bg-dark disabled:opacity-75 disabled:cursor-not-allowed'
  return (
    <button className={className} onClick={onClick} disabled={disabled}>
      <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
        {children}
      </span>
    </button>
  )
}
