type CheckBoxProps = {
  label: string
  isActive: boolean
  onChange: (isChecked: boolean) => void
}
export function CheckBox({ label, isActive, onChange }: CheckBoxProps) {
  return (
    <label className="inline-flex items-center gap-2 font-header text-base18 font-light">
      <input
        type="checkbox"
        checked={isActive}
        onChange={(e) => {
          onChange(e.target.checked)
        }}
        className="h-6 w-6 flex-shrink-0 appearance-none border border-light-35 bg-light-35 checked:bg-check  checked:bg-center checked:bg-no-repeat"
      />
      {label}
    </label>
  )
}
