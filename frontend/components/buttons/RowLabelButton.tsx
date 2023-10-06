import Tooltip from '@images/tooltip-purple.inline.svg'
import { Button } from './Button'

type RowLabelButtonProps = {
  onClick: () => void
  label: string
}
export function RowLabelButton({ onClick, label }: RowLabelButtonProps) {
  return (
    <Button onClick={onClick} type={'tertiary'}>
      <span className="flex items-center gap-2 font-header text-base18 font-semibold">
        {label} <Tooltip />
      </span>
    </Button>
  )
}
