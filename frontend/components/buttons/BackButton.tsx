import Arrow from '../../images/arrow.inline.svg'
import { Button } from './Button'

export type BackButtonProps = {
  onBack: () => void
  disabled?: boolean
}
export function BackButton({ onBack, disabled }: BackButtonProps) {
  return (
    <Button onClick={onBack} type={'secondary'} disabled={disabled}>
      back <Arrow className="mr-2.5 origin-center rotate-180" />
    </Button>
  )
}
