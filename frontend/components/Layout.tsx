import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

import bg from '../images/bg.svg'
import sphere from '../images/sphere.png'

import { useRouter } from 'next/router'
import { WELCOME_METADATA } from 'pages'
import { NEXT_STEPS } from 'pages/next-steps'
import { REVIEW_ELIGIBILITY_METADATA } from 'pages/review-eligibility'
import { VERIFY_ELIGIBILITY_METADATA } from 'pages/verify-eligibility'
import { LOGIN_SOLANA_METADATA } from 'pages/login-solana'
import { CLAIM_TOKENS_METADATA } from 'pages/claim-tokens'
import { classNames } from 'utils/classNames'

import statue from '@images/bg-statue.png'
import statueWithCoins from '@images/bg-statue-with-coins.png'
import Link from 'next/link'

type LayoutProps = {
  children: ReactNode
}
export const Layout = ({ children }: LayoutProps) => {
  const pathname = usePathname()
  const router = useRouter()

  const disableSideNav = process.env.NODE_ENV === 'production'

  // Layout works with few pages link given in below map.
  // A map of url, title, and image
  const urlMap = [
    WELCOME_METADATA,
    REVIEW_ELIGIBILITY_METADATA,
    VERIFY_ELIGIBILITY_METADATA,
    LOGIN_SOLANA_METADATA,
    CLAIM_TOKENS_METADATA,
    NEXT_STEPS,
  ]

  return (
    <>
      <header className="absolute left-0 top-0 z-40 w-full px-1 transition-all lg:px-10">
        <div className="before:gradient-border relative flex items-center justify-between px-4 py-3 lg:py-6 lg:px-10">
          <Image
            src="/pyth-logo-white.svg"
            className="h-30 mr-3"
            alt="pyth logo"
            layout="intrinsic"
            width={26}
            height={33}
          />

          <span className="text-right">
            Please verify that the site URL is:{' '}
            <strong>https://airdrop.pyth.network/</strong>
          </span>
        </div>
      </header>
      <div className="relative px-4 pt-20 pb-32 sm:pt-28 lg:pt-40">
        <div className="mx-auto max-w-[997px] justify-between gap-2.5 lg:flex">
          <ul
            className={classNames(
              'mb-2.5 lg:mb-0 lg:max-w-[292px]',
              disableSideNav ? 'pointer-events-none' : ''
            )}
          >
            {urlMap.map(({ url, title }, index) => {
              let isActive = false
              if (url === '/' && pathname === '/') isActive = true
              if (url !== '/' && pathname.startsWith(url)) isActive = true
              return (
                <li
                  key={url}
                  className={`claim_li ${
                    isActive
                      ? 'bg-darkGray5 text-light'
                      : 'bg-dark text-light-50'
                  }`}
                  role="button"
                  onClick={() => router.push(url)}
                >
                  <span>{index + 1}</span> {title}
                </li>
              )
            })}
          </ul>
          <div className="flex-1 overflow-auto">
            {children}

            <div className="mt-6">
              <p className="font-body text-[15px] ">
                Useful links:{' '}
                <Link
                  href="https://pyth.network/airdrop/faq"
                  className="ml-5 inline-block underline"
                >
                  FAQ
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <span
        className="pointer-events-none fixed top-0 bottom-0 left-0 right-0 z-[-1]"
        style={{
          background:
            'radial-gradient(circle, rgba(70,43,120,1) 0%, rgba(8,6,17,1) 100%)',
        }}
      >
        <Image
          src={bg}
          alt=""
          layout="fill"
          objectFit="cover"
          objectPosition="left bottom"
        />
        <Image
          src={sphere}
          alt=""
          objectFit="cover"
          objectPosition="left bottom"
          style={{
            width: '50%',
            position: 'absolute',
            bottom: '-4%',
            left: '-5%',
            opacity: 0.6,
          }}
        />
        <span className="absolute -left-[430px] -bottom-24 max-h-[100vh] max-w-[1200px]">
          <Image src={statue} alt="" priority />
        </span>
        <span
          className={classNames(
            'absolute -left-[430px] -bottom-24 max-h-[100vh] max-w-[1200px] opacity-0 transition duration-1000 ease-out',
            pathname === NEXT_STEPS.url ? 'opacity-100' : ''
          )}
        >
          <Image src={statueWithCoins} alt="" priority />
        </span>
      </span>
    </>
  )
}
