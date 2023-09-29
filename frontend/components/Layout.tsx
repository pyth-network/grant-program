import Image from 'next/image'
import React, { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import bg from '../images/bg.png'

import Link from 'next/link'
import { WELCOME_METADATA } from 'pages'
import { REVIEW_ELIGIBILITY_METADATA } from 'pages/review-eligibility'
import { VERIFY_ELIGIBILITY_METADATA } from 'pages/verify-eligibility'
import { LOGIN_SOLANA_METADATA } from 'pages/login-solana'
import { CLAIM_TOKENS_METADATA } from 'pages/claim-tokens'
import { NEXT_STEPS } from 'pages/next-steps'
import { classNames } from 'utils/classNames'
import { useRouter } from 'next/router'

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
        <div className="before:gradient-border relative flex items-center justify-between sm:px-4  sm:py-3  lg:py-4  sm:lg:px-10 sm:lg:py-6">
          <Link href="/">
            <Image
              src="/pyth-logo-white.svg"
              className="h-30 mr-3"
              alt="pyth logo"
              layout="intrinsic"
              width={26}
              height={33}
            />
          </Link>
          <span>Placeholder Always Check URL disclaimer placeholder</span>
        </div>
      </header>
      <div className="relative   px-4 pt-40 pb-32">
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
          <div className="flex-1 ">
            {children}

            <div className="mt-6">
              <p className="font-body text-[15px] ">
                Useful links:{' '}
                <Link href="/" className="ml-5 inline-block underline">
                  FAQ
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <span className="pointer-events-none fixed top-0 bottom-0 left-0 right-0 z-[-1]">
        <Image
          src={bg}
          alt=""
          layout="fill"
          objectFit="cover"
          objectPosition="left bottom"
        />
        <span className="absolute -left-[430px] -bottom-24 max-h-[100vh] max-w-[1200px] ">
          <BgImage />
        </span>
      </span>
    </>
  )
}

function BgImage() {
  const pathname = usePathname()

  if (pathname === '/')
    return <Image src={WELCOME_METADATA.image} alt="" priority />
  else if (pathname === '/review-eligibility')
    return <Image src={WELCOME_METADATA.image} alt="" priority />
  else if (pathname.startsWith('/verify-eligibility'))
    return <Image src={WELCOME_METADATA.image} alt="" priority />
  else if (pathname === '/login-solana')
    return <Image src={WELCOME_METADATA.image} alt="" priority />
  else if (pathname === '/claim-tokens')
    return <Image src={WELCOME_METADATA.image} alt="" priority />
  else return <Image src={NEXT_STEPS.image} alt="" priority />
}
