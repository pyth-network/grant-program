import { Box } from '@components/Box'
import { CheckBox } from '@components/CheckBox'
import { Ecosystem } from '@components/Ecosystem'
import { useActivity } from '@components/Ecosystem/ActivityProvider'
import { BackButton, ProceedButton } from '@components/buttons'
import { useCallback, useEffect, useState } from 'react'
import { StepProps } from './common'

export const PastActivity = ({ onBack, onProceed }: StepProps) => {
  const { activity, setActivity } = useActivity()
  const [isProceedDisabled, setIsProceedDisabled] = useState(true)

  // The rule to proceed is:
  // The user must be active in at least one of the ecosystem.
  useEffect(() => {
    const isAnyActive = Object.values(Ecosystem).find(
      (ecosystem) => activity[ecosystem] === true
    )
    if (isAnyActive === undefined) setIsProceedDisabled(true)
    else setIsProceedDisabled(false)
  }, [activity])

  const onChangeForEcosystem = useCallback(
    (ecosystem: Ecosystem) => {
      return (isChecked: boolean) => {
        setActivity(ecosystem, isChecked)
      }
    },
    [setActivity]
  )

  return (
    <>
      <Box>
        <h4 className="border-b border-light-35 bg-[#242339] py-8 px-4 font-header  text-[28px] font-light leading-[1.2] sm:px-10">
          {`Let's Review Your Activity`}
        </h4>
        <div className="px-4 py-8 text-base sm:px-10 sm:text-base16">
          <p className="mb-6">
            Please check the following boxes below corresponding to your wallet
            and social activity in the Pyth ecosystem.
          </p>

          <p className="mb-6 font-light">I am active on…</p>
          <div className="mb-6 grid max-w-[420px] grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {Object.values(Ecosystem).map((ecosystem) => {
              if (ecosystem === Ecosystem.DISCORD) return <></>
              else
                return (
                  <CheckBox
                    label={ecosystem}
                    isActive={activity[ecosystem] === true}
                    onChange={onChangeForEcosystem(ecosystem)}
                  />
                )
            })}
          </div>
          <p className="mb-6 font-light">I am an active member of…</p>
          <div>
            <CheckBox
              label={Ecosystem.DISCORD}
              isActive={activity[Ecosystem.DISCORD] === true}
              onChange={onChangeForEcosystem(Ecosystem.DISCORD)}
            />
          </div>

          <div className="mt-12 flex justify-end gap-4">
            <BackButton onBack={onBack} />
            <ProceedButton onProceed={onProceed} disabled={isProceedDisabled} />
          </div>
        </div>
      </Box>
    </>
  )
}
