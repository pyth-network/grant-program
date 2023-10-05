export function ModalWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed left-0 top-0 z-10 flex h-[100vh] w-full items-center justify-center p-6 before:absolute before:inset-0  before:bg-dark-70 before:bg-gradient2 before:blur-[2px]">
      {children}
    </div>
  )
}
