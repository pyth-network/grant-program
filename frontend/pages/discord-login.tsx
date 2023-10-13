import { Box } from '@components/Box'
import { signIn, useSession } from 'next-auth/react'
import { useEffect } from 'react'
import Loader from '@images/loader.inline.svg'

const DiscordLogin = () => {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (!(status === 'loading') && !session) void signIn('discord')
    if (session) window.close()
  }, [session, status])

  return (
    <Box>
      <div className="flex h-128 items-center justify-center">
        <Loader />
      </div>
    </Box>
  )
}

export default DiscordLogin
