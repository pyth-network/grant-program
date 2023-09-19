import { Layout } from '@components/Layout'
import { useRouter } from 'next/navigation'
import step4 from '../images/step4.png'
import { LogInWithSolana } from '@sections/LogInWithSolana'
import { VERIFY_ELIGIBILITY_METADATA } from './verify-eligibility'
import { CLAIM_TOKENS_METADATA } from './claim-tokens'

export const LOGIN_SOLANA_METADATA = {
  url: '/login-solana',
  title: 'Log in with Solana',
  image: step4,
}

export default function LogInWithSolanaPage() {
  const router = useRouter()

  return (
    <Layout>
      <LogInWithSolana
        onBack={() => {
          router.push(VERIFY_ELIGIBILITY_METADATA.url)
        }}
        onProceed={() => {
          router.push(CLAIM_TOKENS_METADATA.url)
        }}
      />
    </Layout>
  )
}
