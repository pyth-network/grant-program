import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { Ecosystem, ProviderProps } from '.'

type ActivityMap = {
  [ecosystem in Ecosystem]?: boolean
}
type ActivityContextType = {
  setActivity: (ecosystem: Ecosystem, isActive: boolean) => void
  getActivity: (ecosystem: Ecosystem) => boolean
}

const ACTIVIY_KEY = 'activity-store'
function getStoredActivityMap(): ActivityMap | null {
  if (typeof window === 'undefined') return null

  const mapStr = localStorage.getItem(ACTIVIY_KEY)
  if (mapStr === null) return null

  const obj = JSON.parse(mapStr)
  return obj as ActivityMap
}

const ActivityContext = createContext<ActivityContextType | undefined>(
  undefined
)
export function ActivityProvider({ children }: ProviderProps) {
  const [activity, setActivity] = useState(getStoredActivityMap() ?? {})

  // side effect: whenever the activity map changes sync the local storage
  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(ACTIVIY_KEY, JSON.stringify(activity))
  }, [activity])

  const setActivityWrapper = useCallback(
    (ecosystem: Ecosystem, isActive: boolean) => {
      setActivity((prevValue) => ({ ...prevValue, [ecosystem]: isActive }))
    },
    [setActivity]
  )

  const getActivity = useCallback(
    (ecosystem: Ecosystem) => {
      return activity[ecosystem] === true
    },
    [activity]
  )
  return (
    <ActivityContext.Provider
      value={{ getActivity, setActivity: setActivityWrapper }}
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
