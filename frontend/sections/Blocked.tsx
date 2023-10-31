import { Box } from '@components/Box'

export const Blocked = () => {
  return (
    <>
      <Box>
        <h4 className="border-b border-light-35 bg-[#242339] py-8 px-10  font-header text-[28px] font-light leading-[1.2]">
          Error 451: Unavailable For Legal Reasons
        </h4>
        <div className="px-10 py-8 text-base16">
          <p className="mb-6">
            This Site is not available to residents of Belarus, the Central
            African Republic, The Democratic Republic of Congo, the Democratic
            People&apos;s Republic of Korea, the Crimea, Donetsk People&apos;s
            Republic, and Luhansk People&apos;s Republic regions of Ukraine,
            Cuba, Iran, Libya, Somalia, Sudan, South Sudan, Syria, the USA, the
            United Kingdom, Yemen, Zimbabwe and any other jurisdiction in which
            accessing or using the Site is prohibited (the “Prohibited
            Jurisdictions”).
          </p>
        </div>
      </Box>
    </>
  )
}
