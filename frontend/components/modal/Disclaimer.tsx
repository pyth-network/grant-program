import { Button } from '@components/buttons/Button'
import { ModalWrapper } from '@components/modal/ModalWrapper'
import { useState } from 'react'
import { classNames } from 'utils/classNames'

type DisclaimerProps = {
  showModal?: boolean
  onAgree: () => void
}
export function Disclaimer({ onAgree, showModal }: DisclaimerProps) {
  const [agreed, setAgreed] = useState(false)
  return showModal ? (
    <ModalWrapper>
      <div className="relative max-h-[80vh] w-full max-w-[588px] border border-light-35 bg-darkGray1">
        <h3 className=" border-b border-light-35 p-10 font-header text-[36px] font-light">
          {'Disclaimer'}
        </h3>
        <div className="scrollbar flex max-h-[300px] flex-col gap-3 overflow-auto border-b border-light-35 px-10 py-5 font-body text-base font-light leading-5 tracking-widest">
          <p>
            {`The Pyth Data Association Airdrop Site is a website located at
            airdrop.pyth.network (the “Site”). Your use of the Site is entirely at your
            own risk.`}
          </p>
          <p>
            {`The Site is available on an “as is” basis without warranties of any
            kind, either express or implied, including, but not limited to,
            warranties of merchantability, title, fitness for a particular
            purpose and non-infringement.`}
          </p>

          <p>
            {`You assume all risks associated with using the Site, and digital
            assets and decentralized systems generally, including but not
            limited to, that: (a) digital assets are highly volatile; (b) using
            digital assets is inherently risky due to both features of such
            assets and the potential unauthorized acts of third parties; (c) you
            may not have ready access to digital assets; and (d) you may lose
            some or all of your tokens or other digital assets. You agree that
            you will have no recourse against anyone else for any losses due to
            the use of the Site. For example, these losses may arise from or
            relate to: (i) incorrect information; (ii) software or network
            failures; (iii) corrupted digital wallet files; (iv) unauthorized
            access; (v) errors, mistakes, or inaccuracies; or (vi) third-party
            activities.`}
          </p>

          <p>
            {`This Site is not available to residents of Belarus, the Central
            African Republic, The Democratic Republic of Congo, the Democratic
            People's Republic of Korea, the Crimea, Donetsk People’s Republic,
            and Luhansk People’s Republic regions of Ukraine, Cuba, Iran, Libya,
            Somalia, Sudan, South Sudan, Syria, the USA, the United Kingdom,
            Yemen, Zimbabwe and any other jurisdiction in which accessing or
            using the Site is prohibited (the “Prohibited Jurisdictions”).`}
          </p>

          <p>
            {`By using or accessing this Site and related smart contracts, you
            represent, warrant and covenant that you are not and will not be
            located in, incorporated or established in, or a citizen or resident
            of the Prohibited Jurisdictions. You also represent and warrant that
            you are not subject to sanctions or otherwise designated on any list
            of prohibited or restricted parties or excluded or denied persons,
            including but not limited to the lists maintained by the United
            States’ Department of Treasury’s Office of Foreign Assets Control,
            the United Nations Security Council, the European Union or its
            Member States, or any other government authority (a “Prohibited
            Person”). You further covenant that you will not use or access the
            Site on behalf of someone who is located in, incorporated or
            established in, or a citizen or resident of the Prohibited
            Jurisdictions nor a Prohibited Person.`}
          </p>
        </div>
        <div className="[&>button]:w-[200px] flex min-h-fit flex-col items-stretch gap-4 py-5 px-10 text-sm">
          <div
            className="flex items-center justify-center gap-2 hover:cursor-pointer"
            onClick={() => setAgreed((agreed) => !agreed)}
          >
            <span
              className={classNames(
                'relative h-4 w-4 border',
                agreed
                  ? 'before:absolute before:top-1/2 before:left-1/2 before:h-2.5 before:w-2.5 before:-translate-y-1/2 before:-translate-x-1/2 before:bg-light'
                  : ''
              )}
            ></span>
            I have read, understand, and accept these terms.
          </div>
          <Button
            onClick={() => agreed && onAgree()}
            type={'primary'}
            disabled={!agreed}
          >
            <span className="w-[90%]">{'agree and continue'}</span>
          </Button>
        </div>
      </div>
    </ModalWrapper>
  ) : (
    <></>
  )
}
