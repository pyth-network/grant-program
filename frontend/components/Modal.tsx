import React from 'react'
import Close from '@images/close.inline.svg'

const Modal = ({
  openModal,
  children,
}: {
  openModal: Function
  children: React.ReactNode
}) => {
  return (
    <div className="modal">
      <div className="relative  w-full max-w-[588px] bg-darkGray1 p-12 text-center">
        <button
          className="absolute right-0 top-0 flex h-[50px] w-[50px] items-center justify-center bg-darkGray3"
          onClick={() => openModal(false)}
        >
          <Close />
        </button>
        {children}
      </div>
    </div>
  )
}

export default Modal
