import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals'

import { APIError, StackExchangeAPI } from '@connected-users/seAPI'

type MockResponse = {
  items?: any[]
  backoff?: number
  error?: {
    id: number
    name: string
    message: string
  }
}
type MockResponseOrError = MockResponse | Error | SyntaxError

const addMockResponse = (
  mock: jest.Mock<typeof fetch>,
  resp: MockResponseOrError
) => {
  switch (resp.constructor) {
    case SyntaxError:
      return mock.mockResolvedValueOnce({
        json: () => Promise.reject(resp),
      } as unknown as jest.Mocked<Response>)
    case Error:
      return mock.mockRejectedValueOnce(resp)
    default: {
      const { backoff, error, items } = resp as MockResponse
      return mock.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            backoff,
            error_id: error?.id,
            error_name: error?.name,
            error_message: error?.message,
            items,
          }),
      } as unknown as jest.Mocked<Response>)
    }
  }
}

const mockFetch = (...responses: MockResponseOrError[]) => {
  const mock = jest.fn<typeof fetch>()
  responses = responses.length ? responses : [{}]
  for (const response of responses) addMockResponse(mock, response)
  Object.defineProperty(global, 'fetch', { value: mock, configurable: true })
  return mock
}

afterEach(() => {
  if (Object.prototype.hasOwnProperty.call(global, 'fetch'))
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete global.fetch

  jest.restoreAllMocks()
  jest.useRealTimers()
})

beforeEach(() => {
  jest.useFakeTimers()
  jest.spyOn(window, 'location', 'get').mockReturnValue({
    hostname: 'apitest.stackexchange.com',
  } as unknown as Location)
})

describe('We can configure the Stack Exchange API', () => {
  let fetchSpy: jest.Mock<typeof fetch>
  beforeEach(() => {
    fetchSpy = mockFetch()
  })

  const table: {
    apiKey?: string
    siteId?: string
    defaultPageSize?: number
    expected: string
  }[] = [
    { apiKey: 'bar', expected: '?key=bar&site=apitest&pagesize=100' },
    { siteId: 'monty', expected: '?site=monty&pagesize=100' },
    { defaultPageSize: 42, expected: '?site=apitest&pagesize=42' },
  ]
  test.each(table)(
    'with apiKey: $apiKey, siteId: $siteId & defaultPageSize: $defaultPageSize',
    async ({ apiKey, siteId, defaultPageSize, expected }) => {
      const api = new StackExchangeAPI(apiKey, siteId, defaultPageSize)
      await api.fetch('/foo')
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining(expected))
    }
  )
})

describe('We can adjust fetch parameters', () => {
  let fetchSpy: jest.Mocked<typeof fetch>
  let api: StackExchangeAPI
  beforeEach(() => {
    fetchSpy = mockFetch()
    api = new StackExchangeAPI()
  })

  const table: [string, string | number, string][] = [
    ['filter', 'monty', '?filter=monty&site=apitest&pagesize=100'],
    ['pageSize', 42, '?site=apitest&pagesize=42'],
  ]
  test.each(table)('with a %s set to %p', async (key, value, expected) => {
    await api.fetch('/foo', {}, { [key]: value })
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining(expected))
  })
})

describe('We can pass in parameters to the API', () => {
  let fetchSpy: jest.Mocked<typeof fetch>
  let api: StackExchangeAPI
  beforeEach(() => {
    fetchSpy = mockFetch()
    api = new StackExchangeAPI()
  })
  const table: [
    `/${string}`,
    Record<string, string[] | string | number | Date>,
    string
  ][] = [
    ['/foo', { bar: 42 }, '/foo?site=apitest&pagesize=100&bar=42'],
    ['/bar/{spam}', { spam: 'ham' }, '/bar/ham?site=apitest&pagesize=100'],
    [
      '/path/{multiple}',
      { multiple: ['foo', 'bar'] },
      '/path/foo;bar?site=apitest&pagesize=100',
    ],
    [
      '/epoch',
      { date: new Date(647459842000) },
      '/epoch?site=apitest&pagesize=100&date=647459842',
    ],
  ]
  test.each(table)(
    'with path %p and parameters %p',
    async (path, params, expected) => {
      await api.fetch(path, params)
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining(expected))
    }
  )

  test('but missing a path parameter throws an error', async () => {
    await expect(async () => {
      await api.fetch('/foo/{bar}')
    }).rejects.toThrow(/Missing path parameters: \/foo\/{bar}/)
  })
})

describe('We honour the backoff parameter', () => {
  let api: StackExchangeAPI
  let fetchSpy: jest.Mocked<typeof fetch>
  beforeEach(() => {
    fetchSpy = mockFetch({ backoff: 42 }, { backoff: 17 }, {})
    api = new StackExchangeAPI()
  })
  afterEach(() => {
    fetchSpy.mockClear()
  })

  test('by waiting the specified amount of time', async () => {
    await api.fetch('/foo') // backoff = 42
    api.fetch('/foo') // backoff = 17
    api.fetch('/foo')
    for (const t of [2, 10, 10, 10, 10]) {
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      await jest.advanceTimersByTimeAsync(1000 * t)
    }
    // T = 42, first backoff has completed
    for (const t of [7, 10]) {
      expect(fetchSpy).toHaveBeenCalledTimes(2)
      await jest.advanceTimersByTimeAsync(1000 * t)
    }
    // T = 17, second backoff has completed
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })

  test('but only if the path matches', async () => {
    await api.fetch('/ham')
    await api.fetch('/spam')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  test('/me is treated as /users/{ids}', async () => {
    await api.fetch('/me')
    api.fetch('/users/{ids}', { ids: 42 })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    await jest.advanceTimersByTimeAsync(42000)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })
})

describe('We honour the backoff parameter', () => {
  let api: StackExchangeAPI
  beforeEach(() => {
    api = new StackExchangeAPI()
  })

  const errors = [
    new Error('fetch failed'),
    new SyntaxError('JSON.parse failed'),
  ]
  test.each(errors)(
    'fetch-level errors throwing %p reset the backoff value',
    async (error) => {
      const fetchSpy = mockFetch({ backoff: 42 }, error, {})
      await api.fetch('/foo') // backoff = 42
      await jest.advanceTimersByTimeAsync(42000)
      await expect(async () => api.fetch('/foo')).rejects.toThrow(error)
      await api.fetch('/foo')
      expect(fetchSpy).toHaveBeenCalledTimes(3)
    }
  )
})

// cover errors

describe('API errors are passed on to the caller', () => {
  let api: StackExchangeAPI
  beforeEach(() => {
    api = new StackExchangeAPI()
  })

  test('as an APIError instance', async () => {
    const expected = new APIError(
      42,
      'testError',
      'This is a test of the public address system'
    )
    mockFetch({
      error: {
        id: expected.errorId,
        name: expected.errorName,
        message: expected.errorMessage,
      },
    })

    await expect(api.fetch('/foo')).rejects.toThrow(expected)
  })
})
