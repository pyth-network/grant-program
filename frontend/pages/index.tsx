import Image from 'next/image'
import React, { useState } from 'react'
import bg from '../images/bg.png'
import chest from '../images/chest.png'
import chest2 from '../images/chest2.png'

import Link from 'next/link'

import Step1 from '@components/Claim/Step1'
import Step2 from '@components/Claim/Step2'
import Step3 from '@components/Claim/Step3'
import Step4 from '@components/Claim/Step4'
import Step5 from '@components/Claim/Step5'
import Step6 from '@components/Claim/Step6'

const Claim = () => {
  const [step, setStep] = useState(1)

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1 />
      case 2:
        return <Step2 />
      case 3:
        return <Step3 />
      case 4:
        return <Step4 />
      case 5:
        return <Step5 />
      case 6:
        return <Step6 />
    }
  }

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
          <ul className="mb-2.5 lg:mb-0 lg:max-w-[292px]">
            <li
              className={`claim_li ${
                step == 1 ? 'bg-darkGray5 text-light' : 'bg-dark text-light-50'
              }`}
              role="button"
              onClick={() => setStep(1)}
            >
              <span>1</span> Welcome
            </li>
            <li
              className={`claim_li ${
                step == 2 ? 'bg-darkGray5 text-light' : 'bg-dark text-light-50'
              }`}
              role="button"
              onClick={() => setStep(2)}
            >
              <span>2</span> Log in with Solana
            </li>
            <li
              className={`claim_li ${
                step == 3 ? 'bg-darkGray5 text-light' : 'bg-dark text-light-50'
              }`}
              role="button"
              onClick={() => setStep(3)}
            >
              <span>3</span> Review Airdrop Eligibility
            </li>
            <li
              className={`claim_li ${
                step == 4 ? 'bg-darkGray5 text-light' : 'bg-dark text-light-50'
              }`}
              role="button"
              onClick={() => setStep(4)}
            >
              <span>4</span> Verify Eligibility
            </li>
            <li
              className={`claim_li ${
                step == 5 ? 'bg-darkGray5 text-light' : 'bg-dark text-light-50'
              }`}
              role="button"
              onClick={() => setStep(5)}
            >
              <span>5</span> Claim Tokens
            </li>
            <li
              className={`claim_li ${
                step == 6 ? 'bg-darkGray5 text-light' : 'bg-dark text-light-50'
              }`}
              role="button"
              onClick={() => setStep(6)}
            >
              <span>6</span> Next Steps
            </li>
          </ul>
          <div className="flex-1 ">
            {renderStep()}

            <div className="mt-6">
              <p className="font-body text-[15px] ">
                Useful links:{' '}
                <Link href="/">
                  <a className="ml-5 inline-block underline">FAQ</a>
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
        <span className="absolute left-0 bottom-0">
          {step == 6 ? (
            <Image src={chest2} alt="" />
          ) : (
            <Image src={chest} alt="" />
          )}
        </span>
      </span>
    </>
  )
}

export default Claim
