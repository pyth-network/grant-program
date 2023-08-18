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

const Step4 = ({ setStep }: { setStep: Function }) => {
  const [wallet, setWallet] = useState(null)
  const [modal, openModal] = useState(false)
  const [screen, setScreen] = useState(1)
  return (
    <>
      {screen == 1 ? (
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
              <button
                className="btn before:btn-bg  btn--dark before:bg-dark hover:text-dark hover:before:bg-light"
                onClick={() => setStep(3)}
              >
                <span className="relative inline-flex items-center whitespace-nowrap">
                  <Arrow className="mr-2.5 origin-center rotate-180" />
                  back
                </span>
              </button>
              <button
                className="btn before:btn-bg  btn--light  before:bg-light hover:text-light hover:before:bg-dark"
                onClick={() => setScreen(2)}
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
        <Eligibility onBack={() => setScreen(1)} onProceed={() => setStep(5)} />
      )}
    </>
  )
}

export default Step4
