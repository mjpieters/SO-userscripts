/* global StackExchange */
import { seApiKey, seApiUrl } from './constants'

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

// Get the site id for Stack Exchange API and SEDE queries
export function getSiteId(): string {
  return location.hostname.replace(/(\.stackexchange)?\.com$/, '')
}

// Promise that delays resolution for a given number of milliseconds
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type APIResponse<T> = {
  backoff?: number
  error_id?: number
  error_message?: string
  error_name?: string
  items: T[]
}

// holds path => earliest next fetch allowed time in ms
const notBeforeTs: Map<string, number> = new Map()

// Fetch data from the API; handles backoff, API key use and site ID transparently
export async function seApiFetch<T>(path: string): Promise<T[]>
export async function seApiFetch<T>(path: string, filter: string): Promise<T[]>
export async function seApiFetch<T>(
  path: string,
  ...[filter]: [] | [string]
): Promise<T[]> {
  const url = new URL(`${seApiUrl}/${path}`)
  url.search = new URLSearchParams({
    ...(filter && { filter }),
    key: seApiKey,
    site: getSiteId(),
    pagesize: '100',
  }).toString()

  const backoffBy = (notBeforeTs.get(path) ?? 0) - new Date().getTime()
  if (backoffBy > 0) {
    await delay(backoffBy)
  }

  const response = await fetch(url.toString())
  const wrapper: APIResponse<T> = await response.json()
  notBeforeTs.set(path, new Date().getTime() + (wrapper.backoff || 0) ?? 0)

  if (wrapper.error_id) {
    throw new Error(
      `${wrapper.error_name} (${wrapper.error_id}): ${wrapper.error_message}`
    )
  }

  return wrapper.items
}

/** create a camelCase name of a string */
export function camelize(value: string): string {
  return value.replace(/(?:[_-])([a-z0-9])/g, (_, char) => char.toUpperCase())
}

/** Stimulus hook helpers */
type HasControllerId = { controllerId: string }
/** Generate a property name for the given controller type accessed as a single outlet */
export function outlet<T>({ controllerId }: HasControllerId): keyof T {
  return `${camelize(`${controllerId}`)}Outlet` as keyof T
}
/** Generate a property name for the given controller type accessed as an array of outlets */
export function outlets<T>({ controllerId }: HasControllerId): keyof T {
  return `${camelize(`${controllerId}`)}Outlets` as keyof T
}
/** Generate the 'connected' hook property name for the given controller type */
export function outletConnected({ controllerId }: HasControllerId): string {
  return `${camelize(controllerId)}OutletConnected`
}

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

export const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
