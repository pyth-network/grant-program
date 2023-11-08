import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { Ecosystem, ProviderProps } from '.'
import { ActivityStore } from 'utils/store'

export type ActivityMap = {
  [ecosystem in Ecosystem]?: boolean
}
type ActivityContextType = {
  activity: ActivityMap
  setActivity: (ecosystem: Ecosystem, isActive: boolean) => void
}

const ActivityContext = createContext<ActivityContextType | undefined>(
  undefined
)
export function ActivityProvider({ children }: ProviderProps) {
  const [activity, setActivity] = useState(ActivityStore.get() ?? {})

  // side effect: whenever the activity map changes sync the local storage
  useEffect(() => {
    ActivityStore.set(activity)
  }, [activity])

  const setActivityWrapper = useCallback(
    (ecosystem: Ecosystem, isActive: boolean) => {
      setActivity((prevValue) => ({ ...prevValue, [ecosystem]: isActive }))
    },
    [setActivity]
  )

  return (
    <ActivityContext.Provider
      value={{ activity, setActivity: setActivityWrapper }}
    >
      {children}
    </ActivityContext.Provider>
  )
}

export function useActivity(): ActivityContextType {
  const ctx = useContext(ActivityContext)
  if (ctx === undefined)
    throw new Error('Must be used inside Activity Provider')

  return ctx
}
