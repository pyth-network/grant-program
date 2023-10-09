import { ReactNode } from 'react'
import { classNames } from 'utils/classNames'

export type ButtonProps = {
  onClick: () => void
  type: 'primary' | 'secondary'
  disabled?: boolean
  children: ReactNode
}

export function Button({ onClick, type, disabled, children }: ButtonProps) {
  const className =
    type === 'primary'
      ? 'btn--light before:bg-light hover:text-light hover:before:bg-dark disabled:text-dark disabled:before:bg-light'
      : 'btn--dark before:bg-dark hover:text-dark hover:before:bg-light disabled:text-light disabled:before:bg-dark'

  return (
    <button
      className={`btn before:btn-bg ${className} disabled:cursor-not-allowed disabled:opacity-40`}
      onClick={onClick}
      disabled={disabled}
    >
      <span
        className={
          'relative inline-flex items-center gap-2.5 whitespace-nowrap'
        }
      >
        {children}
      </span>
    </button>
  )
}
