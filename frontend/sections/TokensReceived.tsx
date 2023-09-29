import React from 'react'
import Pyth from '@images/pyth.inline.svg'

import Twitter from '@images/twitter.inline.svg'
import Telegram from '@images/telegram.inline.svg'
import Discord from '@images/discord.inline.svg'
import Linkedin from '@images/linkedin.inline.svg'
import { DisplayCoins } from '@components/Coins'

export type TokensReceivedProps = {
  totalCoinsClaimed: string | null
}
export const TokensReceived = ({ totalCoinsClaimed }: TokensReceivedProps) => {
  return (
    <>
      <div className=" border border-light-35 bg-dark">
        <h4 className="border-b border-light-35 bg-[#242339] py-8 px-10  font-header text-[28px] font-light leading-[1.2] ">
          🔮 Congratulations!
        </h4>
        <div className="px-10 py-8 text-base16">
          <h3 className="mb-8 flex items-center gap-2 font-header text-[36px] font-light">
            You Received{' '}
            <span className="flex items-center gap-2 font-bold">
              <DisplayCoins coins={totalCoinsClaimed} />
            </span>
          </h3>
          <p className="mb-6">
            We look forward to our journey together! This is just the beginning
            chapter for the Pyth Network.
          </p>
          <p className="mb-6">
            You can stake your PYTH tokens to participate in Pyth Network’s
            governance, secure the network, and vote on important decisions.
          </p>

          <p>
            Follow us on our socials to stay updated on future grant
            opportunities, developer updates, and community events!
          </p>

          <div
            className="space-between mt-12 flex items-center justify-between
           gap-4"
          >
            <div className="flex gap-2">
              <button className="btn-square ">
                <span className="relative inline-flex items-center whitespace-nowrap">
                  <Twitter />
                </span>
              </button>
              <button className="btn-square ">
                <span className="relative inline-flex items-center whitespace-nowrap">
                  <Telegram />
                </span>
              </button>
              <button className="btn-square ">
                <span className="relative inline-flex items-center whitespace-nowrap">
                  <Discord />
                </span>
              </button>
              <button className="btn-square ">
                <span className="relative inline-flex items-center whitespace-nowrap">
                  <Linkedin />
                </span>
              </button>
            </div>
            <button className="btn before:btn-bg  btn--light  before:bg-light hover:text-light hover:before:bg-dark">
              <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                explore governance
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
