import { Welcome } from '@sections/Welcome'
import { useRouter } from 'next/navigation'
import { REVIEW_ELIGIBILITY_METADATA } from './review-eligibility'

export const WELCOME_METADATA = {
  url: '/',
  title: 'Welcome',
}

export default function WelcomePage() {
  const router = useRouter()

  return (
    <Welcome
      onProceed={() => {
        router.push(REVIEW_ELIGIBILITY_METADATA.url)
      }}
    />
  )
}
