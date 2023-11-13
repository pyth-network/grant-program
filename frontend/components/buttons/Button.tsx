import { ReactNode } from 'react'
import { classNames } from 'utils/classNames'

export type ButtonProps = {
  onClick: () => void
  type: 'primary' | 'secondary' | 'tertiary'
  disabled?: boolean
  children: ReactNode
}

export function Button({ onClick, type, disabled, children }: ButtonProps) {
  const className =
    type === 'primary'
      ? 'btn before:btn-bg btn--light before:bg-light hover:text-light hover:before:bg-dark disabled:text-dark disabled:before:bg-light'
      : type === 'secondary'
      ? 'btn before:btn-bg btn--dark before:bg-dark hover:text-dark hover:before:bg-light disabled:text-light disabled:before:bg-dark'
      : 'hover:cursor-pointer hover:font-bold'

  return (
    <button
      className={`${className} flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-40`}
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
