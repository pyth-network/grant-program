import { Box } from '@components/Box'
import { signOut, useSession } from 'next-auth/react'
import Loader from '@images/loader.inline.svg'
import { useEffect } from 'react'

const DiscordLogout = () => {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (!(status === 'loading') && session) void signOut()
    if (session === null) window.close()
  }, [session, status])

  return (
    <Box>
      <div className="flex h-128 items-center justify-center">
        <Loader />
      </div>
    </Box>
  )
}

export default DiscordLogout
