import Tooltip from '@images/tooltip-purple.inline.svg'
import { Button } from './Button'

type RowLabelButtonProps = {
  onClick: () => void
  label: string
}

export function RowLabelButton({ onClick, label }: RowLabelButtonProps) {
  const windowWidth = window.innerWidth
  const mobile = windowWidth < 600
  return (
    <Button onClick={onClick} type={'tertiary'}>
      <span className="flex items-center gap-2 pr-2 font-header text-base font-semibold leading-none sm:text-base18 sm:font-semibold">
        {label}
        {/* We don't have much space on the mobile screen real estate so we have to choose not to show certain contents */}
        {!mobile ? <Tooltip /> : null}
      </span>
    </Button>
  )
}
