import { seApiKey, seApiUrl } from './constants'
import { delay } from './utils'

/** Get the site id for Stack Exchange API and SEDE queries */
const getSiteId = (): string =>
  location.hostname.replace(/(\.stackexchange)?\.com$/, '')

type APIResponse<T> = {
  backoff?: number
  error_id?: number
  error_message?: string
  error_name?: string
  items: T[]
}
// holds path => earliest next fetch allowed time in ms
const notBeforeTs: Map<string, number> = new Map()

/** Fetch data from the API; handles backoff, API key use and site ID transparently */
export async function seAPIFetch<T>(path: string): Promise<T[]>
export async function seAPIFetch<T>(path: string, filter: string): Promise<T[]>
export async function seAPIFetch<T>(
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
  if (backoffBy > 0) await delay(backoffBy)

  const response = await fetch(url.toString())
  const wrapper: APIResponse<T> = await response.json()
  notBeforeTs.set(path, new Date().getTime() + (wrapper.backoff || 0) ?? 0)

  if (wrapper.error_id)
    throw new Error(
      `${wrapper.error_name} (${wrapper.error_id}): ${wrapper.error_message}`
    )

  return wrapper.items
}
