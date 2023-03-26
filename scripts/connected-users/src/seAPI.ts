import { seAPIURL } from './constants'
import { delay } from './utils'

type APIBackoff = { backoff?: number }
type APIItems<T> = {
  items: T[]
  error_id?: never
}
type APIResponseError = {
  error_id: number
  error_name: string
  error_message: string
}
type APIWrapper<T> = (APIItems<T> | APIResponseError) & APIBackoff
const isAPIError = <T>(wrapper: APIWrapper<T>): wrapper is APIResponseError =>
  wrapper.error_id !== undefined
type APIOptions = {
  filter?: string
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

class FutureBackoff implements PromiseLike<number> {
  private readonly promise: Promise<number>
  resolve: (value: number) => void
  then: Promise<number>['then']
  constructor(immediateValue?: number) {
    this.promise =
      immediateValue === undefined
        ? new Promise<number>((resolve) => {
            this.resolve = resolve
          })
        : Promise.resolve(immediateValue)
    this.then = this.promise.then.bind(this.promise)
  }
}
const NO_BEFORE = new FutureBackoff(0)

export class StackExchangeAPI {
  readonly siteId: string

  constructor(
    readonly apiKey?: string,
    siteId?: string,
    readonly defaultPageSize = 100
  ) {
    this.siteId = siteId || getSiteId()
  }

  /**
   * Fetch data from the API; handles backoff, API key use and site ID transparently
   * @param path The API method path, with {name} placeholders for path parameters; e.g. `/users/{ids}`
   * @param parameters The path and query parameters to use
   * @param options Configuration for the request
   */
  async fetch<T>(
    path: string,
    parameters: APIParameters = {},
    options: APIOptions = {}
  ): Promise<T[]> {
    const url = this.buildURL(path, parameters, options)
    const setBackoff = await this.handleBackoff(path)

    let wrapper: APIWrapper<T>
    try {
      const response = await fetch(url.toString())
      wrapper = await response.json()
      setBackoff(new Date().getTime() + (wrapper.backoff || 0) * 1000)
    } catch (e) {
      setBackoff(0)
      throw e
    }

    if (isAPIError(wrapper)) throw APIError.fromWrapper(wrapper)
    return wrapper.items
  }

  private buildURL(
    path: string,
    parameters: APIParameters,
    options: APIOptions
  ) {
    const search = new URLSearchParams({
      ...(options.filter && { filter: options.filter }),
      ...(this.apiKey && { key: this.apiKey }),
      site: this.siteId,
      pagesize: (options.pageSize === undefined
        ? this.defaultPageSize
        : options.pageSize
      ).toFixed(0),
    })
    let urlpath = path
    for (const [key, value] of Object.entries(parameters)) {
      const param = (Array.isArray(value) ? value : [value])
        .map(convert)
        .join(';')
      const slot = `/{${key}}`
      if (urlpath.includes(slot))
        urlpath = urlpath.replaceAll(slot, `/${param}`)
      else search.append(key, param)
    }
    if (urlpath.match(/\/{\w+}/) !== null)
      throw new Error(`Missing path parameters: ${urlpath}`)
    const url = new URL(`${seAPIURL}${urlpath}`)
    url.search = search.toString()
    return url
  }

  private readonly notBeforeFutures: Map<string, FutureBackoff> = new Map()
  private async handleBackoff(
    path: string
  ): Promise<(backoff: number) => void> {
    // /me.* paths should be treated the same as /users/{ids}.*
    const backoffPath = path.startsWith('/me')
      ? `/users/{ids}${path.substring(3)}`
      : path
    const currBackoff = this.notBeforeFutures.get(backoffPath) ?? NO_BEFORE
    const nextBackof = new FutureBackoff()
    this.notBeforeFutures.set(backoffPath, nextBackof)

    const backoffBy = (await currBackoff) - new Date().getTime()
    if (backoffBy > 0) await delay(backoffBy)

    return nextBackof.resolve
  }
}
