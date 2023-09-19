import { Layout } from '@components/Layout'
import { useRouter } from 'next/navigation'
import step3 from '@images/step3.png'
import { REVIEW_ELIGIBILITY_METADATA } from '../review-eligibility'
import { BackButton, ProceedButton } from '@components/buttons'

export const VERIFY_ELIGIBILITY_METADATA = {
  url: '/verify-eligibility',
  title: 'Verify Eligibility',
  image: step3,
}

export default function VerifyEligibilityPage() {
  const router = useRouter()

  return (
    <Layout>
      <div className=" border border-light-35 bg-dark">
        <h4 className="border-b border-light-35 bg-[#242339] py-8 px-10  font-header text-[28px] font-light leading-[1.2]">
          Verify Eligibility
        </h4>
        <div className="px-10 py-8 text-base16">
          <p className="mb-6">
            Please connect your wallets and Discord account according to the
            boxes you checked in <strong>Step 3</strong>. You can go back and
            change any of your selections.
          </p>
          <p>
            You will be able to proceed to <strong>Step 5</strong> to claim your
            tokens even if you do not successfully connect all of your wallets
            or Discord account.
          </p>

          <div className="mt-12 flex justify-end gap-4">
            <BackButton
              onBack={() => {
                router.push(REVIEW_ELIGIBILITY_METADATA.url)
              }}
            />
            <ProceedButton
              onProceed={() =>
                router.push('/verify-eligibility/check-eligibility')
              }
            />
          </div>
        </div>
      </div>
    </Layout>
  )
}
