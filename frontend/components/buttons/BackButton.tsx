import Arrow from '@images/arrow.inline.svg'
import { Button } from './Button'

export type BackButtonProps = {
  onBack: () => void
  disabled?: boolean
}
export function BackButton({ onBack, disabled }: BackButtonProps) {
  return (
    <Button onClick={onBack} type={'secondary'} disabled={disabled}>
      <Arrow className="origin-center rotate-180" />
      back
    </Button>
  )
}
