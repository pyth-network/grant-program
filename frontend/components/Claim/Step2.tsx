import React from 'react'

import Phantom from '../../images/phantom.inline.svg'
import Backpack from '../../images/backpack.inline.svg'
import Solflare from '../../images/solflare.inline.svg'
import Link from 'next/link'
import Arrow from '../../images/arrow.inline.svg'

const Step2 = () => {
  return (
    <>
      <div className=" border border-light-35 bg-dark">
        <div className="flex items-center justify-between border-b border-light-35  bg-[#242339] py-8 px-10">
          <h4 className="font-header text-[28px] font-light leading-[1.2]">
            Log in with Solana
          </h4>
          <button className="btn before:btn-bg  btn--dark before:bg-[#242339] hover:text-dark hover:before:bg-light">
            <span className="relative inline-flex items-center whitespace-nowrap">
              <Arrow className="mr-2.5 origin-center rotate-180" />
              back
            </span>
          </button>
        </div>
        <div className="px-10 py-8 text-base16">
          <p className="mb-6">
            PYTH tokens are native to Solana. You will need a Solana wallet to
            receive your tokens and to resume progress on this page if you leave
            before claiming. Your claimed PYTH tokens will go to the Solana
            wallet you connect in this step.
          </p>
          <p className="">
            You can find a list of popular wallets that support Solana (SPL)
            tokens below.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button className="btn before:btn-bg  btn--light  before:bg-light hover:text-light hover:before:bg-dark">
              <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                <Phantom /> Phantom
              </span>
            </button>
            <button className="btn before:btn-bg  btn--light  before:bg-light hover:text-light hover:before:bg-dark">
              <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                <Backpack /> Backpack
              </span>
            </button>
            <button className="btn before:btn-bg  btn--light  before:bg-light hover:text-light hover:before:bg-dark">
              <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                <Solflare /> Solflare
              </span>
            </button>

            <Link href="/">
              <a className="ml-4 font-body  text-base16 font-normal underline">
                More wallets
              </a>
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <div>
              <button className="btn before:btn-bg  btn--dark before:bg-dark hover:text-dark hover:before:bg-light">
                <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                  <Phantom />
                  <span>5jfkqsa35 ... 8DqCV</span>
                </span>
              </button>
              <span className="mt-4 block text-center font-body font-normal underline">
                Change wallet
              </span>
            </div>
            <button className="btn before:btn-bg  btn--light  before:bg-light hover:text-light hover:before:bg-dark">
              <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                proceed <Arrow />
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Step2
