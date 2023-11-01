import Image from 'next/image'
import React, { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import bg from '../images/bg.png'

import Link from 'next/link'
import { WELCOME_METADATA } from 'pages'
import { REVIEW_ELIGIBILITY_METADATA } from 'pages/review-eligibility'
import { VERIFY_ELIGIBILITY_METADATA } from 'pages/verify-eligibility'
import { NEXT_STEPS } from 'pages/next-steps'
import { classNames } from 'utils/classNames'
import { useRouter } from 'next/router'

import statue from '@images/bg-statue.png'

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
          <span>
            Please verify that the site URL is:{' '}
            <strong>airdrop.pyth.network</strong>
          </span>
        </div>
      </header>
      <div className="relative px-4 pt-28 pb-32 lg:pt-40">
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
          <div className="flex-1 ">{children}</div>
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
        <span className="absolute -left-[430px] -bottom-24 max-h-[100vh] max-w-[1200px]">
          <Image src={statue} alt="" priority />
        </span>
      </span>
    </>
  )
}
