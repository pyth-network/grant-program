import { Blocked } from '@sections/Blocked'

import { useRouter } from 'next/router'

function CustomErrorPage() {
  const router = useRouter()
  // Wait for the router to be ready before accessing router.query
  if (!router.isReady) {
    return null // or return a loading spinner, or some other placeholder content
  }

  const { statusCode } = router.query

  const message =
    statusCode === '451'
      ? 'Access to this site is restricted for users accessing from the United States due to legal or regulatory requirements.'
      : 'An unexpected error has occurred'

  return (
    <div>
      <h1>Error {statusCode}</h1>
      <p>{message}</p>
      <Blocked />
    </div>
  )
}

export default CustomErrorPage
