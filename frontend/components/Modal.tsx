import React from 'react'
import { ModalCloseButton } from './modal/ModalCloseButton'
import { ModalWrapper } from './modal/ModalWrapper'

const Modal = ({
  openModal,
  children,
}: {
  openModal: Function
  children: React.ReactNode
}) => {
  return (
    <ModalWrapper>
      <div className="relative w-full max-w-[588px] bg-darkGray1 p-12 text-center">
        <ModalCloseButton onClick={() => openModal(false)} />
        {children}
      </div>
    </ModalWrapper>
  )
}

export default Modal
