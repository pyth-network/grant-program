import { Layout } from '@components/Layout'
import { Welcome } from '@sections/Welcome'
import { useRouter } from 'next/navigation'
import step1 from '../images/step1.png'
import { REVIEW_ELIGIBILITY_METADATA } from './review-eligibility'

export const WELCOME_METADATA = {
  url: '/',
  title: 'Welcome',
  image: step1,
}

export default function WelcomePage() {
  const router = useRouter()

  return (
    <Layout>
      <Welcome
        onProceed={() => {
          router.push(REVIEW_ELIGIBILITY_METADATA.url)
        }}
      />
    </Layout>
  )
}
