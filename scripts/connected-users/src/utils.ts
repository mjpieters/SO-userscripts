/* global StackExchange */

/**
 * Add src as a script tag to the document head
 * Returns a promise that resolves when the script is loaded
 */
export function loadScript(src: string): Promise<void> {
  return new Promise(function (resolve, reject) {
    if (document.querySelector(`script[src='${src}']`) !== null)
      return resolve()

    const script = document.createElement('script')
    script.onload = () => resolve()
    script.onerror = (ev: ErrorEvent) => reject(ev.error)
    script.src = src
    document.head.appendChild(script)
  })
}

/**
 * A promise that resolves when the StackExchange.ready callback is fired.
 */
export const documentReady = new Promise((resolve) => {
  StackExchange.ready(() => resolve(null))
})

/** Promise that delays resolution for a given number of milliseconds */
export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/** create a camelCase name of a string */
export const camelize = (value: string): string =>
  value.replace(/(?:[_-])([a-z0-9])/g, (_, char) => char.toUpperCase())

/** Stimulus hook helpers */
type HasControllerId = { controllerId: string }
/** Generate a property name for the given controller type accessed as a single outlet */
export const outlet = <T>({ controllerId }: HasControllerId): keyof T =>
  `${camelize(`${controllerId}`)}Outlet` as keyof T
/** Generate a property name for the given controller type accessed as an array of outlets */
export const outlets = <T>({ controllerId }: HasControllerId): keyof T =>
  `${camelize(`${controllerId}`)}Outlets` as keyof T
/** Generate the 'connected' hook property name for the given controller type */
export const outletConnected = ({ controllerId }: HasControllerId): string =>
  `${camelize(controllerId)}OutletConnected`

export class LruCache<K, V> {
  private values: Map<K, V> = new Map<K, V>()
  private maxEntries = 20

  constructor(maxEntries?: number) {
    if (maxEntries !== undefined) this.maxEntries = maxEntries
  }

  public get(key: K): V | undefined {
    const entry: V | undefined = this.values.get(key)
    if (entry !== undefined) {
      // re-insert for LRU strategy
      this.values.delete(key)
      this.values.set(key, entry)
    }
    return entry
  }

  public put(key: K, value: V) {
    if (this.values.size >= this.maxEntries)
      this.values.delete(this.values.keys().next().value)
    this.values.set(key, value)
  }
}

/** Escape HTML metacharacters in a string */
export const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
