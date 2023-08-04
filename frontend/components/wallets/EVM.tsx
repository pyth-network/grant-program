import { ReactElement, ReactNode, useMemo, useState } from 'react'
import Wallet from '../../images/wallet.inline.svg'
import { Listbox, Transition } from '@headlessui/react'
import Modal from '@components/Claim/Modal'
import {
  WagmiConfig,
  createConfig,
  useAccount,
  useConnect,
  useDisconnect,
} from 'wagmi'
import Down from '../../images/down2.inline.svg'
import { ConnectKitProvider, getDefaultConfig } from 'connectkit'
import { truncateAddress } from 'utils/truncateAddress'

const config = createConfig(
  getDefaultConfig({
    alchemyId: process.env.NEXT_PUBLIC_ALCHEMY_KEY,
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
    appName: 'Pyth Network',
    appIcon: 'https://pyth.network/social-logo.png',
    autoConnect: false,
  })
)

type EVMWalletProviderProps = {
  children: ReactNode
}

export function EVMWalletProvider({
  children,
}: EVMWalletProviderProps): ReactElement {
  return (
    <WagmiConfig config={config}>
      <ConnectKitProvider>{children}</ConnectKitProvider>
    </WagmiConfig>
  )
}

export function EVMWalletButton() {
  const { isSuccess } = useConnect()
  const { disconnect } = useDisconnect()
  const { address, status, isDisconnected } = useAccount()

  const buttonText = useMemo(() => {
    if (address == undefined) return status

    return truncateAddress(address)
  }, [address, status])

  if (isDisconnected === true) return <EVMWalletModalButton />
  return (
    <button
      className="btn before:btn-bg btn--dark min-w-[207px]  before:bg-dark hover:text-dark hover:before:bg-light"
      onClick={() => disconnect()}
    >
      <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
        <Wallet />
        <span>{buttonText ?? 'Connected'}</span>
      </span>
    </button>
  )
}

function EVMWalletModalButton() {
  const [modal, openModal] = useState(false)
  const { connect, connectors } = useConnect()

  return (
    <>
      <button
        className="btn before:btn-bg btn--dark min-w-[207px]  before:bg-dark hover:text-dark hover:before:bg-light"
        onClick={() => openModal(true)}
      >
        <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
          <Wallet />
          <span>select your wallet</span>
        </span>
      </button>
      {modal && (
        <Modal openModal={openModal}>
          <h3 className="mb-16  font-header text-[36px] font-light">
            Select Your Wallet
          </h3>
          <div className="mx-auto max-w-[200px]">
            <Listbox>
              {({ open }) => (
                <>
                  <Listbox.Button className="block w-full border border-light-35 py-3 px-8">
                    <span className="relative inline-flex items-center gap-2.5  whitespace-nowrap">
                      <span>explore options</span>
                      <Down className={`${open ? 'rotate-0' : 'rotate-180'}`} />
                    </span>
                  </Listbox.Button>
                  <Transition
                    enter="transition duration-100 ease-out"
                    enterFrom="transform scale-95 opacity-0"
                    enterTo="transform scale-100 opacity-100"
                    leave="transition duration-75 ease-out"
                    leaveFrom="transform scale-100 opacity-100"
                    leaveTo="transform scale-95 opacity-0"
                  >
                    <Listbox.Options className="absolute -mt-[1px] w-full divide-y divide-light-35 border border-light-35 bg-darkGray1">
                      {connectors.map((connector) => (
                        <Listbox.Option
                          key={connector.id}
                          value={connector.name}
                          className="flex cursor-pointer items-center justify-center gap-2.5 py-3 px-8 hover:bg-darkGray3"
                          onClick={() => {
                            connect({ connector })
                            openModal(false)
                          }}
                          disabled={!connector.ready}
                        >
                          <Wallet />
                          {connector.name}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </>
              )}
            </Listbox>
          </div>
        </Modal>
      )}
    </>
  )
}
