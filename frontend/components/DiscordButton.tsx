import React, { useEffect, useMemo } from 'react'

import Discord from '../images/discord.inline.svg'

import { signIn, signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import { fetchAmountAndProof } from 'utils/api'
import { useEligiblity } from './Ecosystem/EligibilityProvider'
import { Ecosystem } from './Ecosystem'

type DiscordButtonProps = {
  disableOnAuth?: boolean
}
export function DiscordButton({ disableOnAuth }: DiscordButtonProps) {
  const { data, status } = useSession()

  const { logo, text } = useMemo(() => {
    if (status === 'authenticated')
      return {
        logo: data.user?.image ? (
          <Image
            src={data.user?.image}
            alt="user image"
            width={20}
            height={20}
          />
        ) : (
          <Discord />
        ),
        text: data.user?.name ?? 'Signed In',
      }

    return {
      logo: <Discord />,
      text: 'Sign In',
    }
  }, [status, data?.user])

  const { eligibility, setEligibility } = useEligiblity()

  // fetch the eligibility and store it
  useEffect(() => {
    ;(async () => {
      if (status === 'authenticated' && data?.user?.name) {
        // NOTE: we need to check if identity was previously stored
        // We can't check it using eligibility[account?.address] === undefined
        // As, an undefined eligibility can be stored before.
        // Hence, we are checking if the key exists in the object
        if (data?.user?.name in eligibility[Ecosystem.DISCORD]) return
        else
          setEligibility(
            Ecosystem.DISCORD,
            data?.user?.name,
            await fetchAmountAndProof('discord', data?.user?.name)
          )
      }
    })()
  }, [status, setEligibility, data?.user?.name, eligibility])

  return (
    <button
      className={
        'btn before:btn-bg  btn--dark before:bg-dark hover:text-dark hover:before:bg-light disabled:text-light disabled:before:bg-dark'
      }
      onClick={() => {
        if (status === 'unauthenticated') signIn('discord')
        if (status === 'authenticated') signOut()
      }}
      disabled={disableOnAuth}
    >
      <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
        {logo}
        <span>{text}</span>
      </span>
    </button>
  )
}
