import Arrow from '@images/arrow.inline.svg'
import { Button } from './Button'
import Tooltip from '@components/Tooltip'

export type ProceedButtonProps = {
  onProceed: () => void
  disabled?: boolean
  tooltipContent?: string
  placement?: string
  hideText?: boolean
}
export function ProceedButton({
  onProceed,
  disabled,
  tooltipContent,
  hideText,
}: ProceedButtonProps) {
  return (
    <Tooltip content={tooltipContent} placement={'bottom'}>
      <Button onClick={onProceed} type={'primary'} disabled={disabled}>
        {hideText ? '' : 'proceed'} <Arrow />
      </Button>
    </Tooltip>
  )
}
