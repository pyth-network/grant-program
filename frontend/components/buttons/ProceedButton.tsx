import Arrow from '@images/arrow.inline.svg'
import { Button } from './Button'

export type ProceedButtonProps = {
  onProceed: () => void
  disabled?: boolean
}
export function ProceedButton({ onProceed, disabled }: ProceedButtonProps) {
  return (
    <Button onClick={onProceed} type={'primary'} disabled={disabled}>
      proceed <Arrow />
    </Button>
  )
}
