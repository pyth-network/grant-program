import React from 'react'
import Arrow from '../../images/arrow.inline.svg'

const Step3 = ({ setStep }: { setStep: Function }) => {
  return (
    <>
      <div className=" border border-light-35 bg-dark">
        <h4 className="border-b border-light-35 bg-[#242339] py-8 px-10  font-header text-[28px] font-light leading-[1.2]">
          Let’s Review Your Past Activity
        </h4>
        <div className="px-10 py-8 text-base16">
          <p className="mb-6">
            Please check the following boxes below corresponding to your past
            wallet and social activity in the Pyth ecosystem.
          </p>

          <p className="mb-6 font-light">I am active on…</p>
          <div className="mb-6 grid max-w-[420px] grid-cols-4 gap-4">
            <label className="checkbox">
              <input type="checkbox" name="solana" id="" />
              Solana
            </label>
            <label className="checkbox">
              <input type="checkbox" name="solana" id="" />
              EVM
            </label>
            <label className="checkbox">
              <input type="checkbox" name="solana" id="" />
              Aptos
            </label>
            <label className="checkbox">
              <input type="checkbox" name="solana" id="" />
              Sui
            </label>
            <label className="checkbox">
              <input type="checkbox" name="solana" id="" />
              Injective
            </label>
            <label className="checkbox">
              <input type="checkbox" name="solana" id="" />
              Osmosis
            </label>
            <label className="checkbox">
              <input type="checkbox" name="solana" id="" />
              Neutron
            </label>
          </div>
          <p className="mb-6 font-light">I am an active member of…</p>
          <div>
            <label className="checkbox">
              <input type="checkbox" name="solana" id="" />
              Pyth Discord
            </label>
          </div>

          <div className="mt-12 flex justify-end gap-4 ">
            <button
              className="btn before:btn-bg  btn--dark before:bg-dark hover:text-dark hover:before:bg-light"
              onClick={() => setStep(2)}
            >
              <span className="relative inline-flex items-center whitespace-nowrap">
                <Arrow className="mr-2.5 origin-center rotate-180" />
                back
              </span>
            </button>
            <button
              className="btn before:btn-bg  btn--light  before:bg-light hover:text-light hover:before:bg-dark"
              onClick={() => setStep(4)}
            >
              <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                proceed
                <Arrow />
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Step3
