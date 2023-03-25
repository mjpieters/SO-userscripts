import { seAPIURL } from './constants'
import { delay } from './utils'

type APIBackoff = { backoff?: number }
type APIItems<T> = {
  items: T[]
  error_id?: never
}
type APIResponseError = {
  error_id: number
  error_message: string
  error_name: string
}
type APIWrapper<T> = (APIItems<T> | APIResponseError) & APIBackoff
const isAPIError = <T>(wrapper: APIWrapper<T>): wrapper is APIResponseError =>
  wrapper.error_id !== undefined
type APIOptions = {
  filter?: string
  apiKey?: string
  siteId?: string
  pageSize?: number
}
type APIParameters = {
  [key: string]: number[] | string[] | Date[] | string | number | Date
}

export class APIError extends Error {
  constructor(
    public readonly errorId: number,
    public readonly errorMessage: string,
    public readonly errorName: string
  ) {
    super(`${errorName} (${errorId}): ${errorMessage}`)
    this.name = 'APIError'
  }

  static fromWrapper(wrapper: APIResponseError): APIError {
    return new APIError(
      wrapper.error_id,
      wrapper.error_message,
      wrapper.error_name
    )
  }
}

/** Get the site id for Stack Exchange API and SEDE queries */
const getSiteId = (): string =>
  location.hostname.replace(/(\.stackexchange)?\.com$/, '')

/**
 * Convert a value to a string used in API paths or query strings
 * Note that numbers are _always_ integers in API parameters.
 */
const convert = (v: string | number | Date): string =>
  typeof v === 'string'
    ? v
    : (v instanceof Date ? Math.round(v.getTime() / 1000) : v).toFixed(0)

// holds path => earliest next fetch allowed time in ms
const notBeforeTs: Map<string, number> = new Map()

/**
 * Fetch data from the API; handles backoff, API key use and site ID transparently
 * @param path The API method path, with {name} placeholders for path parameters; e.g. `/users/{ids}`
 * @param options Configuration for the request
 * @param parameters The path and query parameters to use
 */
export async function seAPIFetch<T>(
  path: string,
  options: APIOptions = {},
  parameters: APIParameters = {}
): Promise<T[]> {
  const url = new URL(`${seAPIURL}${path}`)
  const search = new URLSearchParams({
    ...(options.filter && { filter: options.filter }),
    ...(options.apiKey && { key: options.apiKey }),
    site: options.siteId || getSiteId(),
    pagesize: (options.pageSize || 100).toFixed(0),
  })
  for (const [key, value] of Object.entries(parameters)) {
    const param = (Array.isArray(value) ? value : [value])
      .map(convert)
      .join(';')
    const slot = `/{${key}}`
    if (url.pathname.includes(slot))
      url.pathname = url.pathname.replaceAll(slot, encodeURIComponent(param))
    else search.append(key, param)
  }
  if (url.pathname.match(/\/{\w+}/) !== null)
    throw Error(`Missing path parameters: ${url.pathname}`)
  url.search = search.toString()

  // /me.* paths should be treated the same as /users/{ids}.*
  const backoffPath = path.startsWith('/me')
    ? `/users/{ids}${path.substring(3)}`
    : path
  const backoffBy = (notBeforeTs.get(backoffPath) ?? 0) - new Date().getTime()
  if (backoffBy > 0) await delay(backoffBy)

  const response = await fetch(url.toString())
  const wrapper: APIWrapper<T> = await response.json()
  notBeforeTs.set(backoffPath, new Date().getTime() + (wrapper.backoff || 0))

  if (isAPIError(wrapper)) throw APIError.fromWrapper(wrapper)
  return wrapper.items
}
