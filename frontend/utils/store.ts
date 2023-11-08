import { ActivityMap } from '@components/Ecosystem/ActivityProvider'
import { EligibilityMap } from '@components/Ecosystem/EligibilityProvider'
import { SignatureMap } from '@components/Ecosystem/SignatureProvider'
import { BN } from '@coral-xyz/anchor'
import { ClaimInfo } from 'claim_sdk/claim'

abstract class Store<T> {
  constructor(protected readonly key: string) {}

  set(t: T) {
    if (typeof window === undefined) return
    if (typeof t === 'string') localStorage.setItem(this.key, t)
    else localStorage.setItem(this.key, JSON.stringify(t))
  }

  remove() {
    localStorage.removeItem(this.key)
  }

  abstract get(): T | null
}

class ActivityStore_ extends Store<ActivityMap> {
  get() {
    if (typeof window === 'undefined') return null

    const mapStr = localStorage.getItem(this.key)
    if (mapStr === null) return null

    const obj = JSON.parse(mapStr)
    return obj as ActivityMap
  }
}

class EligibilityStore_ extends Store<EligibilityMap> {
  get() {
    if (typeof window === 'undefined') return null

    const mapStr = localStorage.getItem(this.key)
    if (mapStr === null) return null

    const obj = JSON.parse(mapStr)

    // Every other key value pair is fine, except for ClaimInfo.
    // We need to do some customized parsing as it is a class.
    Object.keys(obj).forEach((ecosystem) => {
      Object.keys(obj[ecosystem]).forEach((identity) => {
        if (obj[ecosystem][identity] === undefined) return
        const claimInfo = obj[ecosystem][identity].claimInfo
        obj[ecosystem][identity].claimInfo = new ClaimInfo(
          claimInfo.ecosystem,
          claimInfo.identity,
          new BN(claimInfo.amount, 'hex')
        )

        obj[ecosystem][identity].proofOfInclusion = obj[ecosystem][
          identity
        ].proofOfInclusion.map((chunk: any) => Buffer.from(chunk))
      })
    })

    return obj as EligibilityMap
  }
}

class SignatureStore_ extends Store<SignatureMap> {
  get() {
    if (typeof window === 'undefined') return null

    const mapStr = localStorage.getItem(this.key)
    if (mapStr === null) return null

    const obj = JSON.parse(mapStr)
    Object.keys(obj).forEach((solanaIdentity) => {
      Object.keys(obj[solanaIdentity]).forEach((ecosystem) => {
        Object.keys(obj[solanaIdentity][ecosystem]).forEach(
          (ecosystemIdentity) => {
            const signedMsg = obj[solanaIdentity][ecosystem][ecosystemIdentity]
            obj[solanaIdentity][ecosystem][ecosystemIdentity] = {
              // parsing the stringified buffer here
              publicKey: Buffer.from(signedMsg.publicKey),
              signature: Buffer.from(signedMsg.signature),
              recoveryId: signedMsg.recoveryId,
              fullMessage: Buffer.from(signedMsg.fullMessage),
            }
          }
        )
      })
    })
    return obj as SignatureMap
  }
}

class PathnameStore_ extends Store<string> {
  get() {
    if (typeof window === 'undefined') return null

    return localStorage.getItem(this.key)
  }
}

class DisclaimerCheckStore_ extends Store<'true' | 'false'> {
  readonly appVersion = '1'
  get() {
    if (typeof window === 'undefined') return null

    return localStorage.getItem(this.key) as 'true' | 'false'
  }
}

class VersionStore_ extends Store<string> {
  readonly appVersion = '1'
  get() {
    if (typeof window === 'undefined') return null

    return localStorage.getItem(this.key)
  }
}

export const ActivityStore = new ActivityStore_('activity-store')
export const EligibilityStore = new EligibilityStore_('eligibility-key')
export const SignatureStore = new SignatureStore_('signature-key')
export const PathnameStore = new PathnameStore_('last-step-status-key')
export const DisclaimerCheckStore = new DisclaimerCheckStore_('disclaimer-read')
export const VersionStore = new VersionStore_('version-store-key')

export function resetLocalState() {
  ActivityStore.remove()
  EligibilityStore.remove()
  SignatureStore.remove()
  PathnameStore.remove()
  DisclaimerCheckStore.remove()

  // NOTE: Do not clear version store. We are using it as a flag
  // to safely update the website
}

// callback will be called if there is a version mismatch.
export function resetOnVersionMismatch(cb: () => void) {
  const oldVersion = VersionStore.get()
  if (oldVersion === VersionStore.appVersion) return

  resetLocalState()
  // the clean state is compatible with the new version and hence
  VersionStore.set(VersionStore.appVersion)
  cb()
}
