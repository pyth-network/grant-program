// pages/error/[statusCode].tsx
import { useRouter } from 'next/router'
import ErrorPage from '../_error'

const CustomErrorRoute = () => {
  const router = useRouter()
  const { statusCode } = router.query

  return <ErrorPage statusCode={parseInt(statusCode as string, 10)} />
}

export default CustomErrorRoute
