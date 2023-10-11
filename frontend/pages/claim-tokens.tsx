import { useRouter } from 'next/router'
import { SignAndClaim } from '@sections/SignAndClaim'
import { LOGIN_SOLANA_METADATA } from './login-solana'
import { NEXT_STEPS } from './next-steps'

export const CLAIM_TOKENS_METADATA = {
  url: '/claim-tokens',
  title: 'Claim Tokens',
}

export default function ClaimTokensPage() {
  const router = useRouter()

  return (
    <SignAndClaim
      onBack={() => {
        router.push(LOGIN_SOLANA_METADATA.url)
      }}
      onProceed={(totalTokensClaimed: string) => {
        router.push({
          pathname: NEXT_STEPS.url,
          query: { totalTokensClaimed },
        })
      }}
    />
  )
}
