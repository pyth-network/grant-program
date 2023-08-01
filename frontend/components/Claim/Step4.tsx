import React, { useState } from 'react'
import { Listbox, Transition } from '@headlessui/react'
import Arrow from '../../images/arrow.inline.svg'

import Down from '../../images/down.inline.svg'

import Phantom from '../../images/phantom.inline.svg'
import Backpack from '../../images/backpack.inline.svg'
import Solflare from '../../images/solflare.inline.svg'

import Modal from './Modal'
import Eligibility from './Eligibility'

const wallets = [
  { id: 1, name: 'Phantom', icon: <Phantom /> },
  { id: 2, name: 'Backpack', icon: <Backpack /> },
  { id: 2, name: 'Solflare', icon: <Solflare /> },
]

const Step4 = () => {
  const [wallet, setWallet] = useState(null)
  const [modal, openModal] = useState(false)
  const [step, setStep] = useState(1)
  return (
    <>
      {step == 1 ? (
        <div className=" border border-light-35 bg-dark">
          <h4 className="border-b border-light-35 bg-[#242339] py-8 px-10  font-header text-[28px] font-light leading-[1.2]">
            Verify Eligibility
          </h4>
          <div className="px-10 py-8 text-base16">
            <p className="mb-6">
              Please connect your wallets and Discord account according to the
              boxes you checked in <strong>Step 3</strong>. You can go back and
              change any of your selections.
            </p>
            <p>
              You will be able to proceed to <strong>Step 5</strong> to claim
              your tokens even if you do not successfully connect all of your
              wallets or Discord account.
            </p>

            <div className="mt-12 flex justify-end gap-4">
              <button className="btn before:btn-bg  btn--dark before:bg-dark hover:text-dark hover:before:bg-light">
                <span className="relative inline-flex items-center whitespace-nowrap">
                  <Arrow className="mr-2.5 origin-center rotate-180" />
                  back
                </span>
              </button>
              <button
                className="btn before:btn-bg  btn--light  before:bg-light hover:text-light hover:before:bg-dark"
                onClick={() => setStep(2)}
              >
                <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                  proceed
                  <Arrow />
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <Eligibility openModal={openModal} setStep={setStep} />
      )}
      {modal && (
        <Modal openModal={openModal}>
          <h3 className="mb-16  font-header text-[36px] font-light">
            Select Your Wallet
          </h3>
          <div className="mx-auto max-w-[200px]">
            <Listbox value={wallet} onChange={setWallet}>
              <Listbox.Button className="block w-full border border-light-35 py-3 px-8">
                <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                  <span>explore options</span>
                  <Down />
                </span>
              </Listbox.Button>
              <Transition
                enter="transition duration-100 ease-out"
                enterFrom="transform scale-95 opacity-0"
                enterTo="transform scale-100 opacity-100"
                leave="transition duration-75 ease-out"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
              >
                <Listbox.Options className="absolute -mt-[1px] w-full divide-y divide-light-35 border border-light-35 bg-darkGray1">
                  {wallets.map((wallet) => (
                    <Listbox.Option
                      key={wallet.id}
                      value={wallet}
                      className="flex cursor-pointer items-center justify-center gap-2.5 py-3 px-8 hover:bg-darkGray3"
                      onClick={() => openModal(false)}
                    >
                      {wallet.icon} {wallet.name}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </Transition>
            </Listbox>
          </div>
        </Modal>
      )}
    </>
  )
}

export default Step4
