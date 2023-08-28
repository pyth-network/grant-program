import React, { useEffect, useMemo } from 'react'

import Discord from '../../images/discord.inline.svg'

import { signIn, signOut, useSession } from 'next-auth/react'
import Image from 'next/image'
import { ECOSYSTEM, useEcosystem } from '@components/EcosystemProvider'
import { fetchAmountAndProof } from 'utils/api'

export function DiscordButton() {
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

  const { setEligibility } = useEcosystem()

  // fetch the eligibility and store it
  useEffect(() => {
    ;(async () => {
      if (status === 'authenticated' && data?.user?.name) {
        const eligibility = await fetchAmountAndProof(
          'discord',
          data?.user?.name
        )
        setEligibility(ECOSYSTEM.DISCORD, eligibility)
      } else {
        setEligibility(ECOSYSTEM.DISCORD, undefined)
      }
    })()
  }, [status, setEligibility, data?.user?.name])

  return (
    <button
      className={
        'btn before:btn-bg  btn--dark before:bg-dark hover:text-dark hover:before:bg-light'
      }
      onClick={() => {
        if (status === 'unauthenticated') signIn('discord')
        if (status === 'authenticated') signOut()
      }}
    >
      <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
        {logo}
        <span>{text}</span>
      </span>
    </button>
  )
}
