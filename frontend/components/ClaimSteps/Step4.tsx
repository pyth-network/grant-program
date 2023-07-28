import React from 'react'
import Arrow from '../../images/arrow.inline.svg'
import Wallet from '../../images/wallet.inline.svg'
import Coin from '../../images/coin.inline.svg'

import TooltipIcon from '../../images/tooltip.inline.svg'
import Verified from '../../images/verified.inline.svg'
import NotEligible from '../../images/not.inline.svg'
import Discord from '../../images/discord.inline.svg'
import Tooltip from '@components/Tooltip'

const Step4 = () => {
  return (
    <>
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
            You will be able to proceed to <strong>Step 5</strong> to claim your
            tokens even if you do not successfully connect all of your wallets
            or Discord account.
          </p>

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
      <span className="block py-4"></span>
      <div className=" border border-light-35 bg-dark">
        <div className="flex items-center justify-between border-b border-light-35 bg-[#242339] py-8 px-10">
          <h4 className="   font-header text-[28px] font-light leading-[1.2]">
            Verify Eligibility
          </h4>
          <div className="flex gap-4">
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
        <table>
          <tbody>
            <tr className="border-b border-light-35">
              <td className="w-full py-2 pl-10 pr-4">
                <div className="flex items-center justify-between">
                  <span className="font-header text-base18 font-thin">
                    Solana Activity
                  </span>

                  <span className="flex items-center gap-5">
                    <button className="btn before:btn-bg btn--dark  min-w-[207px] before:bg-dark hover:text-dark hover:before:bg-light">
                      <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                        <Wallet />
                        <span>5jfkqsa35 ... 8DqCV</span>
                      </span>
                    </button>

                    <Tooltip content="Congratulations! This wallet is successfully connected. Click on the wallet address to change to another wallet.">
                      <TooltipIcon />
                    </Tooltip>
                    <Verified />
                  </span>
                </div>
              </td>
              <td className="min-w-[130px] border-l border-light-35 bg-darkGray5">
                <span className="flex items-center justify-center  gap-1 text-[20px]">
                  1000 <Coin />
                </span>
              </td>
            </tr>
            <tr className="border-b border-light-35">
              <td className="w-full py-2 pl-10 pr-4">
                <div className="flex items-center justify-between">
                  <span className="font-header text-base18 font-thin">
                    EVM Activity
                  </span>
                  <span className="flex items-center gap-5">
                    <button className="btn before:btn-bg btn--dark min-w-[207px] before:bg-dark hover:text-dark hover:before:bg-light ">
                      <span className="relative inline-flex  items-center  gap-2.5 whitespace-nowrap">
                        <Wallet />
                        <span>5jfkqsa35 ... 8DqCV</span>
                      </span>
                    </button>
                    <Tooltip content="This wallet is unfortunately not eligible for an allocation. You can click on the wallet address to change to another wallet.">
                      <TooltipIcon />
                    </Tooltip>
                    <NotEligible />
                  </span>
                </div>
              </td>
              <td className="min-w-[130px] border-l border-light-35 bg-dark-25">
                <span className="flex items-center justify-center  gap-1 text-[20px]">
                  N/A
                </span>
              </td>
            </tr>
            <tr className="border-b border-light-35 ">
              <td className="w-full py-2 pl-10 pr-4 opacity-25">
                <div className="flex items-center justify-between">
                  <span className="font-header text-base18 font-thin">
                    Aptos Activity
                  </span>
                  <span className="flex items-center gap-5">
                    <button className="btn before:btn-bg btn--dark min-w-[207px] min-w-[207px] before:bg-dark hover:text-dark hover:before:bg-light">
                      <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                        <Wallet />
                        <span>connect wallet</span>
                      </span>
                    </button>
                    <TooltipIcon />
                    <Verified className="opacity-0" />
                  </span>
                </div>
              </td>
              <td className="min-w-[130px] border-l border-light-35 bg-dark-25">
                <span className="flex items-center justify-center  gap-1 text-[20px]">
                  {''}
                </span>
              </td>
            </tr>
            <tr className="border-b border-light-35 ">
              <td className="w-full py-2 pl-10 pr-4 opacity-25">
                <div className="flex items-center justify-between">
                  <span className="font-header text-base18 font-thin">
                    Sui Activity
                  </span>
                  <span className="flex items-center gap-5">
                    <button className="btn before:btn-bg btn--dark min-w-[207px] before:bg-dark hover:text-dark hover:before:bg-light">
                      <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                        <Wallet />
                        <span>connect wallet</span>
                      </span>
                    </button>
                    <TooltipIcon />
                    <Verified className="opacity-0" />
                  </span>
                </div>
              </td>
              <td className="min-w-[130px] border-l border-light-35 bg-dark-25">
                <span className="flex items-center justify-center  gap-1 text-[20px]">
                  {''}
                </span>
              </td>
            </tr>
            <tr className="border-b border-light-35 ">
              <td className="w-full py-2 pl-10 pr-4 opacity-25">
                <div className="flex items-center justify-between">
                  <span className="font-header text-base18 font-thin">
                    Injective Activity
                  </span>
                  <span className="flex items-center gap-5">
                    <button className="btn before:btn-bg btn--dark min-w-[207px] before:bg-dark hover:text-dark hover:before:bg-light">
                      <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                        <Wallet />
                        <span>connect wallet</span>
                      </span>
                    </button>
                    <TooltipIcon />
                    <Verified className="opacity-0" />
                  </span>
                </div>
              </td>
              <td className="min-w-[130px] border-l border-light-35 bg-dark-25">
                <span className="flex items-center justify-center  gap-1 text-[20px]">
                  {''}
                </span>
              </td>
            </tr>
            <tr className="border-b border-light-35 ">
              <td className="w-full py-2 pl-10 pr-4 opacity-25">
                <div className="flex items-center justify-between">
                  <span className="font-header text-base18 font-thin">
                    Osmosis Activity
                  </span>
                  <span className="flex items-center gap-5">
                    <button className="btn before:btn-bg btn--dark min-w-[207px] before:bg-dark hover:text-dark hover:before:bg-light">
                      <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                        <Wallet />
                        <span>connect wallet</span>
                      </span>
                    </button>
                    <TooltipIcon />
                    <Verified className="opacity-0" />
                  </span>
                </div>
              </td>
              <td className="min-w-[130px] border-l border-light-35 bg-dark-25">
                <span className="flex items-center justify-center  gap-1 text-[20px]">
                  {''}
                </span>
              </td>
            </tr>
            <tr className="border-b border-light-35 ">
              <td className="w-full py-2 pl-10 pr-4 opacity-25">
                <div className="flex items-center justify-between">
                  <span className="font-header text-base18 font-thin">
                    Neutron Activity
                  </span>
                  <span className="flex items-center gap-5">
                    <button className="btn before:btn-bg btn--dark min-w-[207px] before:bg-dark hover:text-dark hover:before:bg-light">
                      <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                        <Wallet />
                        <span>connect wallet</span>
                      </span>
                    </button>
                    <TooltipIcon />
                    <Verified className="opacity-0" />
                  </span>
                </div>
              </td>
              <td className="min-w-[130px] border-l border-light-35 bg-dark-25">
                <span className="flex items-center justify-center  gap-1 text-[20px]">
                  {''}
                </span>
              </td>
            </tr>
            <tr className="border-b border-light-35 ">
              <td className="w-full py-2 pl-10 pr-4 ">
                <div className="flex items-center justify-between">
                  <span className="font-header text-base18 font-thin">
                    Discord Activity
                  </span>
                  <span className="flex items-center gap-5">
                    <button className="btn before:btn-bg  btn--dark before:bg-dark hover:text-dark hover:before:bg-light">
                      <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                        <Discord />
                        <span>connect</span>
                      </span>
                    </button>
                    <TooltipIcon />
                    <Verified className="opacity-0" />
                  </span>
                </div>
              </td>
              <td className="min-w-[130px] border-l border-light-35 bg-dark-25">
                <span className="flex items-center justify-center  gap-1 text-[20px]">
                  {''}
                </span>
              </td>
            </tr>
            <tr className="border-b border-light-35 ">
              <td className="w-full bg-darkGray5 py-2 pl-10 pr-4">
                <div className="flex items-center justify-between">
                  <span className="font-header text-base18 font-semibold">
                    Eligible Token Allocation
                  </span>
                </div>
              </td>
              <td className="min-w-[130px] border-l border-light-35 bg-dark-25">
                <span className=" flex min-h-[60px]  items-center justify-center gap-1 text-[20px] font-semibold">
                  1000 <Coin />{' '}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  )
}

export default Step4
