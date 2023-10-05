import Close from '@images/close.inline.svg'

// It places itself relative to the parent
// Parent should have the style  position:relative/absolute
export function ModalCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="absolute right-0 top-0 flex h-[50px] w-[50px] items-center justify-center bg-darkGray3"
      onClick={onClick}
    >
      <Close />
    </button>
  )
}
