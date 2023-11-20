import Pyth from '@images/pyth.inline.svg'

import { Box } from '@components/Box'
import { Button } from '@components/buttons/Button'
import Discord from '@images/discord.inline.svg'
import Linkedin from '@images/linkedin.inline.svg'
import Telegram from '@images/telegram.inline.svg'
import Twitter from '@images/twitter.inline.svg'
import Link from 'next/link'
import { resetLocalState } from 'utils/store'

export type TokensReceivedProps = {
  totalCoinsClaimed: string | null
}
export const TokensReceived = ({ totalCoinsClaimed }: TokensReceivedProps) => {
  return (
    <>
      <Box>
        <div className="flex items-center justify-between border-b border-light-35 bg-[#242339] py-8 px-4 sm:px-10">
          <h4 className="font-header text-[24px] font-light leading-[1.2] sm:text-[28px] ">
            🔮 Congratulations!
          </h4>
          <Button
            onClick={() => {
              resetLocalState()
              location.replace('/')
            }}
            type={'secondary'}
          >
            Claim Again
          </Button>
        </div>
        <div className="px-4 py-8 text-base sm:px-10 sm:text-base16">
          <h3 className="mb-8 flex items-center gap-2 font-header text-[36px] font-light">
            You Received{' '}
            <span className="flex items-center gap-2 font-bold">
              {totalCoinsClaimed === null ? (
                'N/A'
              ) : (
                <>
                  {totalCoinsClaimed} <Pyth />
                </>
              )}
            </span>
          </h3>
          <p className="mb-6">
            You can stake your PYTH tokens to participate in Pyth Network’s
            governance, secure the network, and vote on important decisions.
          </p>

          <p>
            Follow us on our socials to stay updated on grant opportunities,
            developer updates, and community events!
          </p>

          <div
            className="space-between mt-12 flex flex-wrap items-center justify-between
           gap-4"
          >
            <div className="flex gap-2">
              <Link
                className="btn-square "
                href={'https://x.com/PythNetwork'}
                target="_blank"
              >
                <span className="relative inline-flex items-center whitespace-nowrap">
                  <Twitter />
                </span>
              </Link>
              <Link
                className="btn-square "
                href={'https://t.me/Pyth_Network'}
                target="_blank"
              >
                <span className="relative inline-flex items-center whitespace-nowrap">
                  <Telegram />
                </span>
              </Link>
              <Link
                className="btn-square "
                href={'https://discord.gg/PythNetwork'}
                target="_blank"
              >
                <span className="relative inline-flex items-center whitespace-nowrap">
                  <Discord />
                </span>
              </Link>
              <Link
                className="btn-square "
                href={'https://www.linkedin.com/company/pyth-network'}
                target="_blank"
              >
                <span className="relative inline-flex items-center whitespace-nowrap">
                  <Linkedin />
                </span>
              </Link>
            </div>
            <Button
              onClick={() => {
                window.location.href = 'https://staking.pyth.network/'
              }}
              type={'primary'}
            >
              explore governance
            </Button>
          </div>
        </div>
      </Box>
    </>
  )
}
