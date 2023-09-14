import Arrow from '@images/arrow.inline.svg'
import { Button } from './Button'
import Tooltip from '@components/Tooltip'

export type ProceedButtonProps = {
  onProceed: () => void
  disabled?: boolean
  tooltipContent?: string
  placement?: string
}
export function ProceedButton({
  onProceed,
  disabled,
  tooltipContent,
}: ProceedButtonProps) {
  return (
    <Tooltip content={tooltipContent} placement={'bottom'}>
      <Button onClick={onProceed} type={'primary'} disabled={disabled}>
        proceed <Arrow />
      </Button>
    </Tooltip>
  )
}
