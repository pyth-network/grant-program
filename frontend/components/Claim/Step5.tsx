import React from 'react'
import Arrow from '../../images/arrow.inline.svg'

const Step5 = () => {
  return (
    <>
      <div className=" border border-light-35 bg-dark">
        <h4 className="border-b border-light-35 bg-[#242339] py-8 px-10  font-header text-[28px] font-light leading-[1.2]">
          Sign Your Wallets and Claim
        </h4>
        <div className="px-10 py-8 text-base16">
          <p className="mb-6">
            Please sign your connected wallets. To sign, click the corresponding
            “sign” button for each wallet. Your wallet will ask if you wish to
            sign the transaction. Confirm by clicking “sign” in your wallet’s
            pop-up window.
          </p>
          <p>Your claimed PYTH tokens will go to this Solana wallet:</p>

          <div className="mt-12 flex justify-end gap-4">
            <button className="btn before:btn-bg  btn--dark before:bg-dark hover:text-dark hover:before:bg-light">
              <span className="relative inline-flex items-center whitespace-nowrap">
                <Arrow className="mr-2.5 origin-center rotate-180" />
                back
              </span>
            </button>
            <button className="btn before:btn-bg  btn--light  before:bg-light hover:text-light hover:before:bg-dark">
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

export default Step5
