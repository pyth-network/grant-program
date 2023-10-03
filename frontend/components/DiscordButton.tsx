import React, { useMemo } from 'react'

import Discord from '@images/discord.inline.svg'

import { useSession } from 'next-auth/react'
import Image from 'next/image'

type DiscordButtonProps = {
  disableOnAuth?: boolean
}

// NextAuth doesn't have the feature to authenticate in a new window.
// We are opening a popup ourselves with specific pages. These pages
// do the signIn and signOut action on load.
// Please see the page - /discord-login and /discord-logout for more.
const popupCenter = (url: string, title: string) => {
  const newWindow = window.open(url, title)
  newWindow?.focus()
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

  return (
    <button
      className={
        'btn before:btn-bg  btn--dark before:bg-dark hover:text-dark hover:before:bg-light disabled:text-light disabled:before:bg-dark'
      }
      onClick={() => {
        if (status === 'unauthenticated')
          popupCenter('/discord-login', 'Pyth | Discord')
        if (status === 'authenticated')
          popupCenter('/discord-logout', 'Pyth | Discord')
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
