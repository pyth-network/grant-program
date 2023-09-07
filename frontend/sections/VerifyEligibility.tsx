import React, { useState } from 'react'
import Eligibility from './WalletsEligibility'
import { ProceedButton, BackButton } from '@components/buttons'
import { StepProps } from './common'

export const VerifyEligibility = ({ onBack, onProceed }: StepProps) => {
  const [screen, setScreen] = useState(1)
  return (
    <>
      {screen == 1 ? (
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
              You will be able to proceed to <strong>Step 5</strong> to claim
              your tokens even if you do not successfully connect all of your
              wallets or Discord account.
            </p>

            <div className="mt-12 flex justify-end gap-4">
              <BackButton onBack={onBack} />
              <ProceedButton onProceed={() => setScreen(2)} />
            </div>
          </div>
        </div>
      ) : (
        <Eligibility onBack={() => setScreen(1)} onProceed={onProceed} />
      )}
    </>
  )
}
