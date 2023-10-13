import { useRouter } from 'next/navigation'
import { LogInWithSolana } from '@sections/LogInWithSolana'
import { VERIFY_ELIGIBILITY_METADATA } from './verify-eligibility'
import { CLAIM_TOKENS_METADATA } from './claim-tokens'
import { useActivity } from '@components/Ecosystem/ActivityProvider'
import { Ecosystem } from '@components/Ecosystem'
import { LoggedInSolana } from '@sections/LoggedInSolana'

export const LOGIN_SOLANA_METADATA = {
  url: '/login-solana',
  title: 'Log in with Solana',
}

export default function LogInWithSolanaPage() {
  const router = useRouter()
  const { activity } = useActivity()

  if (activity[Ecosystem.SOLANA] === true)
    return (
      <LoggedInSolana
        onBack={() => {
          router.push(VERIFY_ELIGIBILITY_METADATA.url)
        }}
        onProceed={() => {
          router.push(CLAIM_TOKENS_METADATA.url)
        }}
      />
    )

  return (
    <LogInWithSolana
      onBack={() => {
        router.push(VERIFY_ELIGIBILITY_METADATA.url)
      }}
      onProceed={() => {
        router.push(CLAIM_TOKENS_METADATA.url)
      }}
    />
  )
}
