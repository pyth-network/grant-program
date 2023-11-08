import { Listbox, Transition } from '@headlessui/react'
import Down from '@images/down2.inline.svg'
import { ReactNode } from 'react'

type DropdownProps = {
  title: string
  icon?: ReactNode
  items: {
    label: string | ReactNode
    icon?: ReactNode
    onClick: () => void
  }[]
}

export function Dropdown({ icon, title, items }: DropdownProps) {
  return (
    <div className="relative z-10">
      <Listbox>
        {({ open }) => (
          <>
            <Listbox.Button className="btn before:btn-bg btn--dark min-w-[207px] before:bg-dark hover:text-dark hover:before:bg-light">
              <span className="relative inline-flex items-center gap-1 whitespace-nowrap  sm:gap-2.5">
                {icon}
                <span>{title}</span>
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
              <Listbox.Options className="absolute top-0 w-full divide-y divide-light-35 border border-light-35 bg-darkGray1">
                {items.map((item, index) => (
                  <Listbox.Option
                    key={index}
                    value={item.label}
                    className="relative z-50 flex cursor-pointer items-center justify-center gap-2.5 py-3 px-8 hover:bg-darkGray3"
                    onClick={item.onClick}
                  >
                    {item.icon}
                    {item.label}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </>
        )}
      </Listbox>
    </div>
  )
}
